#include "history_engine.hpp"

#include <charconv>

namespace {

std::string EscapeJsonPointerToken(std::string_view token) {
  std::string escaped;
  escaped.reserve(token.size());
  for (const char ch : token) {
    if (ch == '~') {
      escaped += "~0";
    } else if (ch == '/') {
      escaped += "~1";
    } else {
      escaped.push_back(ch);
    }
  }
  return escaped;
}

std::vector<std::string> SplitJsonPointer(std::string_view pointer,
                                          std::string& error_message) {
  std::vector<std::string> tokens;
  if (pointer.empty()) {
    return tokens;
  }
  if (pointer.front() != '/') {
    error_message = "JSON Pointer must start with '/' or be empty";
    return {};
  }

  size_t start = 1;
  while (start <= pointer.size()) {
    const size_t slash = pointer.find('/', start);
    const size_t end =
        (slash == std::string_view::npos) ? pointer.size() : slash;

    std::string token;
    for (size_t i = start; i < end; ++i) {
      const char ch = pointer[i];
      if (ch == '~') {
        if (i + 1 >= end) {
          error_message = "Invalid '~' escape in JSON Pointer";
          return {};
        }
        const char next = pointer[i + 1];
        if (next == '0') {
          token.push_back('~');
          ++i;
          continue;
        }
        if (next == '1') {
          token.push_back('/');
          ++i;
          continue;
        }
        error_message = "Invalid JSON Pointer escape sequence";
        return {};
      }
      token.push_back(ch);
    }

    tokens.push_back(std::move(token));
    if (slash == std::string_view::npos) {
      break;
    }
    start = slash + 1;
  }

  return tokens;
}

bool ParseArrayIndex(std::string_view token, size_t& index) {
  if (token.empty()) {
    return false;
  }

  size_t parsed = 0;
  const auto* begin = token.data();
  const auto* end = token.data() + token.size();
  const auto result = std::from_chars(begin, end, parsed);
  if (result.ec != std::errc{} || result.ptr != end) {
    return false;
  }

  index = parsed;
  return true;
}

void AppendReplaceOp(wpi::util::json& patch,
                     const std::string& path,
                     const wpi::util::json& value) {
  auto op = wpi::util::json::object();
  op["op"] = "replace";
  op["path"] = path;
  op["value"] = value;
  patch.get_array().push_back(std::move(op));
}

void AppendAddOp(wpi::util::json& patch,
                 const std::string& path,
                 const wpi::util::json& value) {
  auto op = wpi::util::json::object();
  op["op"] = "add";
  op["path"] = path;
  op["value"] = value;
  patch.get_array().push_back(std::move(op));
}

void AppendRemoveOp(wpi::util::json& patch, const std::string& path) {
  auto op = wpi::util::json::object();
  op["op"] = "remove";
  op["path"] = path;
  patch.get_array().push_back(std::move(op));
}

void BuildJsonPatchRecursive(const wpi::util::json& from,
                             const wpi::util::json& to,
                             const std::string& path,
                             wpi::util::json& patch) {
  if (from.type() != to.type()) {
    AppendReplaceOp(patch, path, to);
    return;
  }

  if (from.is_object()) {
    const auto& from_object = from.get_object();
    const auto& to_object = to.get_object();

    for (const auto& [key, _] : from_object) {
      if (!to.contains(key)) {
        const std::string child_path = path + "/" + EscapeJsonPointerToken(key);
        AppendRemoveOp(patch, child_path);
      }
    }

    for (const auto& [key, to_value] : to_object) {
      const std::string child_path = path + "/" + EscapeJsonPointerToken(key);
      if (!from.contains(key)) {
        AppendAddOp(patch, child_path, to_value);
      } else {
        BuildJsonPatchRecursive(from.at(key), to_value, child_path, patch);
      }
    }

    return;
  }

  if (from.is_array()) {
    const auto& from_array = from.get_array();
    const auto& to_array = to.get_array();

    if (from_array.size() != to_array.size()) {
      // Keep array diffs simple and deterministic: size changes become a
      // whole-array replace instead of add/remove index juggling.
      AppendReplaceOp(patch, path, to);
      return;
    }

    for (size_t i = 0; i < from_array.size(); ++i) {
      BuildJsonPatchRecursive(from_array[i], to_array[i],
                              path + "/" + std::to_string(i), patch);
    }

    return;
  }

  if (from != to) {
    AppendReplaceOp(patch, path, to);
  }
}

wpi::util::json BuildJsonPatch(const wpi::util::json& from,
                               const wpi::util::json& to) {
  auto patch = wpi::util::json::array();
  BuildJsonPatchRecursive(from, to, "", patch);
  return patch;
}

}  // namespace

namespace choreo::state_server {

HistoryEntry MakeHistoryEntryFromSnapshots(
    std::string reason,
    const wpi::util::json& before,
    const wpi::util::json& after,
    std::chrono::system_clock::time_point recorded_at) {
  // Undo reverses after -> before, redo replays before -> after.
  return HistoryEntry{.reason = std::move(reason),
                      .undo_patch = BuildJsonPatch(after, before),
                      .redo_patch = BuildJsonPatch(before, after),
                      .recorded_at = recorded_at};
}

HistoryEngine::HistoryEngine(std::string scope_key, size_t max_depth)
    : m_scope_key(std::move(scope_key)), m_max_depth(max_depth) {}

std::string_view HistoryEngine::ScopeKey() const {
  return m_scope_key;
}

void HistoryEngine::Record(HistoryEntry entry) {
  if (!entry.undo_patch.is_array() || !entry.redo_patch.is_array()) {
    return;
  }

  if (entry.undo_patch.get_array().empty() && entry.redo_patch.get_array().empty()) {
    return;
  }

  if (entry.recorded_at.time_since_epoch().count() == 0) {
    entry.recorded_at = std::chrono::system_clock::now();
  }

  m_stacks.redo.clear();
  m_stacks.undo.push_back(std::move(entry));

  while (m_stacks.undo.size() > m_max_depth) {
    m_stacks.undo.pop_front();
  }
}

std::optional<HistoryEntry> HistoryEngine::Undo() {
  if (m_stacks.undo.empty()) {
    return std::nullopt;
  }

  auto entry = std::move(m_stacks.undo.back());
  m_stacks.undo.pop_back();
  m_stacks.redo.push_back(entry);
  return entry;
}

std::optional<HistoryEntry> HistoryEngine::Redo() {
  if (m_stacks.redo.empty()) {
    return std::nullopt;
  }

  auto entry = std::move(m_stacks.redo.back());
  m_stacks.redo.pop_back();
  m_stacks.undo.push_back(entry);
  return entry;
}

bool HistoryEngine::CanUndo() const {
  return !m_stacks.undo.empty();
}

bool HistoryEngine::CanRedo() const {
  return !m_stacks.redo.empty();
}

size_t HistoryEngine::UndoDepth() const {
  return m_stacks.undo.size();
}

size_t HistoryEngine::RedoDepth() const {
  return m_stacks.redo.size();
}

void HistoryEngine::Clear() {
  m_stacks.undo.clear();
  m_stacks.redo.clear();
}

bool ApplyJsonPatch(wpi::util::json& target,
                    const wpi::util::json& patch,
                    std::string& error_message) {
  if (!patch.is_array()) {
    error_message = "history patch must be an RFC6902 JSON Patch array";
    return false;
  }

  for (const auto& op_json : patch.get_array()) {
    if (!op_json.is_object() || !op_json.contains("op") ||
        !op_json.at("op").is_string() || !op_json.contains("path") ||
        !op_json.at("path").is_string()) {
      error_message = "history patch operation must include string op and path";
      return false;
    }

    const std::string op = op_json.at("op").get_string();
    const std::string path = op_json.at("path").get_string();

    if (path.empty()) {
      if (op == "remove") {
        target = nullptr;
        continue;
      }

      if (op == "add" || op == "replace") {
        if (!op_json.contains("value")) {
          error_message = "history patch operation is missing value";
          return false;
        }

        target = op_json.at("value");
        continue;
      }

      error_message = "unsupported history patch operation at root";
      return false;
    }

    error_message.clear();
    auto tokens = SplitJsonPointer(path, error_message);
    if (!error_message.empty()) {
      return false;
    }

    if (tokens.empty()) {
      error_message = "history patch path must not be empty";
      return false;
    }

    wpi::util::json* current = &target;
    for (size_t i = 0; i + 1 < tokens.size(); ++i) {
      const auto& token = tokens[i];
      if (current->is_object()) {
        if (!current->contains(token)) {
          error_message = "history patch path traverses missing object member";
          return false;
        }
        current = &(*current)[token];
        continue;
      }

      if (current->is_array()) {
        size_t index = 0;
        if (!ParseArrayIndex(token, index) || index >= current->get_array().size()) {
          error_message = "history patch path has invalid array index";
          return false;
        }
        current = &current->get_array()[index];
        continue;
      }

      error_message = "history patch path traverses non-container value";
      return false;
    }

    const auto& leaf = tokens.back();
    if (current->is_object()) {
      if (op == "remove") {
        if (!current->contains(leaf)) {
          error_message = "history patch remove path does not exist";
          return false;
        }
        current->erase(leaf);
        continue;
      }

      if (!op_json.contains("value")) {
        error_message = "history patch operation is missing value";
        return false;
      }

      if (op == "replace" && !current->contains(leaf)) {
        error_message = "history patch replace path does not exist";
        return false;
      }

      if (op == "add" || op == "replace") {
        (*current)[leaf] = op_json.at("value");
        continue;
      }

      error_message = "unsupported history patch operation for object";
      return false;
    }

    if (current->is_array()) {
      auto& array = current->get_array();
      if (op == "add") {
        if (!op_json.contains("value")) {
          error_message = "history patch add operation is missing value";
          return false;
        }

        if (leaf == "-") {
          array.push_back(op_json.at("value"));
          continue;
        }

        size_t index = 0;
        if (!ParseArrayIndex(leaf, index) || index > array.size()) {
          error_message = "history patch add has invalid array index";
          return false;
        }

        array.insert(array.begin() + static_cast<std::ptrdiff_t>(index),
                     op_json.at("value"));
        continue;
      }

      size_t index = 0;
      if (!ParseArrayIndex(leaf, index) || index >= array.size()) {
        error_message = "history patch has invalid array index";
        return false;
      }

      if (op == "remove") {
        array.erase(array.begin() + static_cast<std::ptrdiff_t>(index));
        continue;
      }

      if (op == "replace") {
        if (!op_json.contains("value")) {
          error_message = "history patch replace operation is missing value";
          return false;
        }

        array[index] = op_json.at("value");
        continue;
      }

      error_message = "unsupported history patch operation for array";
      return false;
    }

    error_message = "history patch path resolves to non-container value";
    return false;
  }

  return true;
}

}  // namespace choreo::state_server

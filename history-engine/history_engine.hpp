#pragma once

#include <chrono>
#include <deque>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>

#include <wpi/util/json.hpp>

namespace choreo::state_server {

struct HistoryEntry {
  std::string scope_key;
  std::string reason;
  wpi::util::json undo_patch;
  wpi::util::json redo_patch;
  std::chrono::system_clock::time_point recorded_at;
};

[[nodiscard]] HistoryEntry MakeHistoryEntryFromSnapshots(
    std::string scope_key,
    std::string reason,
    const wpi::util::json& before,
    const wpi::util::json& after,
    std::chrono::system_clock::time_point recorded_at =
        std::chrono::system_clock::now());

[[nodiscard]] bool ApplyJsonPatch(wpi::util::json& target,
                                  const wpi::util::json& patch,
                                  std::string& error_message);

struct HistoryStacks {
  std::deque<HistoryEntry> undo;
  std::deque<HistoryEntry> redo;
};

class HistoryEngine final {
 public:
  explicit HistoryEngine(size_t max_depth = 50);

  void Record(HistoryEntry entry);

  [[nodiscard]] std::optional<HistoryEntry> Undo(std::string_view scope_key);
  [[nodiscard]] std::optional<HistoryEntry> Redo(std::string_view scope_key);

  [[nodiscard]] bool CanUndo(std::string_view scope_key) const;
  [[nodiscard]] bool CanRedo(std::string_view scope_key) const;
  [[nodiscard]] size_t UndoDepth(std::string_view scope_key) const;
  [[nodiscard]] size_t RedoDepth(std::string_view scope_key) const;

  void ClearScope(std::string_view scope_key);
  void ClearAll();

 private:
  HistoryStacks& EnsureScope(std::string_view scope_key);
  [[nodiscard]] const HistoryStacks* FindScope(
      std::string_view scope_key) const;

  size_t m_max_depth;
  std::unordered_map<std::string, HistoryStacks> m_scopes;
};

}  // namespace choreo::state_server

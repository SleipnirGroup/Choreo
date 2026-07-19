#pragma once

#include <chrono>
#include <deque>
#include <optional>
#include <string>
#include <string_view>

#include <wpi/util/json.hpp>

namespace choreo::state_server {

/**
 * A single reversible change recorded for a history scope.
 */
struct HistoryEntry {
  /// Human-readable mutation reason, used for diagnostics and tracing.
  std::string reason;
  /// RFC6902 patch that transforms post-mutation state back to pre-mutation state.
  wpi::util::json undo_patch;
  /// RFC6902 patch that transforms pre-mutation state to post-mutation state.
  wpi::util::json redo_patch;
  /// Wall-clock time when this entry was recorded.
  std::chrono::system_clock::time_point recorded_at;
};

/**
 * Build a history entry by diffing before/after snapshots into undo and redo patches.
 *
 * @param reason Mutation reason label.
 * @param before Pre-mutation JSON snapshot.
 * @param after Post-mutation JSON snapshot.
 * @param recorded_at Entry timestamp.
 * @return Patch-based history entry.
 */
[[nodiscard]] HistoryEntry MakeHistoryEntryFromSnapshots(
    std::string reason,
    const wpi::util::json& before,
    const wpi::util::json& after,
    std::chrono::system_clock::time_point recorded_at =
        std::chrono::system_clock::now());

/**
 * Apply an RFC6902-style patch document to a JSON value.
 *
 * Supported operations are add, remove, and replace.
 *
 * @param target JSON value to mutate in place.
 * @param patch Patch document (JSON array of operations).
 * @param error_message Populated when patch application fails.
 * @return True when all operations apply successfully; otherwise false.
 */
[[nodiscard]] bool ApplyJsonPatch(wpi::util::json& target,
                                  const wpi::util::json& patch,
                                  std::string& error_message);

/**
 * Undo and redo stacks for a single scope.
 */
struct HistoryStacks {
  /// Entries available to undo.
  std::deque<HistoryEntry> undo;
  /// Entries available to redo.
  std::deque<HistoryEntry> redo;
};

/**
 * In-memory history engine for one immutable scope key.
 */
class HistoryEngine final {
 public:
  /**
   * @param scope_key Scope represented by this engine instance.
   * @param max_depth Maximum number of undo entries retained per scope.
   */
  explicit HistoryEngine(std::string scope_key, size_t max_depth = 50);

  /// @return Scope key represented by this engine.
  [[nodiscard]] std::string_view ScopeKey() const;

  /**
  * Record a new entry and clear redo history for this engine's scope.
   */
  void Record(HistoryEntry entry);

  /**
  * Pop the latest undo entry and move it to redo.
   *
   * @return Entry to apply, or nullopt when no undo is available.
   */
  [[nodiscard]] std::optional<HistoryEntry> Undo();

  /**
   * Pop the latest redo entry and move it back to undo.
   *
   * @return Entry to apply, or nullopt when no redo is available.
   */
  [[nodiscard]] std::optional<HistoryEntry> Redo();

  /// @return True when this scope has at least one undo entry.
  [[nodiscard]] bool CanUndo() const;
  /// @return True when this scope has at least one redo entry.
  [[nodiscard]] bool CanRedo() const;
  /// @return Number of undo entries available for this scope.
  [[nodiscard]] size_t UndoDepth() const;
  /// @return Number of redo entries available for this scope.
  [[nodiscard]] size_t RedoDepth() const;

  /// Clear all history for this scope.
  void Clear();

 private:
  std::string m_scope_key;
  size_t m_max_depth;
  HistoryStacks m_stacks;
};

}  // namespace choreo::state_server

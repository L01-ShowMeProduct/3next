import '../models/task.dart';

/// In-memory storage for the MVP demo — swap for Firestore/local DB later.
class TaskRepository {
  final List<Task> _tasks = [];

  void addAll(List<Task> tasks) => _tasks.addAll(tasks);

  List<Task> topThree() {
    final sorted = [..._tasks]
      ..sort((a, b) => b.priority.index.compareTo(a.priority.index));
    return sorted.take(3).toList();
  }

  void reorder(List<Task> newTop3) {
    for (var i = 0; i < newTop3.length; i++) {
      final priority = Priority.values[Priority.values.length - 1 - i];
      final idx = _tasks.indexWhere((t) => t.id == newTop3[i].id);
      if (idx != -1) _tasks[idx] = _tasks[idx].copyWith(priority: priority);
    }
  }

  void clear() => _tasks.clear();
}

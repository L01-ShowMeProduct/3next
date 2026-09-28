enum Priority { low, medium, high }

class Task {
  Task({
    required this.id,
    required this.title,
    this.deadlineLabel,
    this.priority = Priority.medium,
  });

  final String id;
  final String title;
  final String? deadlineLabel;
  final Priority priority;

  Task copyWith({Priority? priority}) {
    return Task(
      id: id,
      title: title,
      deadlineLabel: deadlineLabel,
      priority: priority ?? this.priority,
    );
  }
}

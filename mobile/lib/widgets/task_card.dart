import 'package:flutter/material.dart';
import '../models/task.dart';

class TaskCard extends StatelessWidget {
  const TaskCard({super.key, required this.task, required this.rank});

  final Task task;
  final int rank;

  Color _priorityColor() {
    switch (task.priority) {
      case Priority.high:
        return Colors.red;
      case Priority.medium:
        return Colors.orange;
      case Priority.low:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _priorityColor(),
          child: Text('$rank', style: const TextStyle(color: Colors.white)),
        ),
        title: Text(task.title),
        subtitle: task.deadlineLabel != null
            ? Text('Deadline: ${task.deadlineLabel}')
            : null,
        trailing: const Icon(Icons.drag_handle),
      ),
    );
  }
}

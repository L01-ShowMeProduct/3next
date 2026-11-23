import 'package:flutter/material.dart';
import '../models/task.dart';
import '../services/task_repository.dart';
import '../widgets/task_card.dart';

class Top3Screen extends StatefulWidget {
  const Top3Screen({super.key, required this.repository});

  final TaskRepository repository;

  @override
  State<Top3Screen> createState() => _Top3ScreenState();
}

class _Top3ScreenState extends State<Top3Screen> {
  final List<Task> _top3 = [];
  bool _confirmed = false;

  @override
  void initState() {
    super.initState();
    _top3.addAll(widget.repository.topThree());
  }

  void _onReorder(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final item = _top3.removeAt(oldIndex);
      _top3.insert(newIndex, item);
      _confirmed = false;
    });
  }

  void _confirm() {
    widget.repository.reorder(_top3);
    setState(() => _confirmed = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Đã xác nhận Top 3 việc cần làm')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Top 3 việc tiếp theo')),
      body: _top3.isEmpty
          ? const Center(child: Text('Chưa có việc nào được ghi lại.'))
          : Column(
              children: [
                const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    'Kéo thả để đổi thứ tự nếu AI xếp chưa đúng, rồi bấm Xác nhận.',
                    textAlign: TextAlign.center,
                  ),
                ),
                Expanded(
                  child: ReorderableListView.builder(
                    itemCount: _top3.length,
                    onReorder: _onReorder,
                    itemBuilder: (context, index) {
                      final task = _top3[index];
                      return TaskCard(
                        key: ValueKey(task.id),
                        task: task,
                        rank: index + 1,
                      );
                    },
                  ),
                ),
              ],
            ),
      floatingActionButton: _top3.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: _confirmed ? null : _confirm,
              icon: Icon(_confirmed ? Icons.check_circle : Icons.check),
              label: Text(_confirmed ? 'Đã xác nhận' : 'Xác nhận'),
            ),
    );
  }
}

import 'package:flutter/material.dart';
import '../services/ai_parser_service.dart';
import '../services/task_repository.dart';
import 'top3_screen.dart';

class CaptureScreen extends StatefulWidget {
  const CaptureScreen({super.key});

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  final _controller = TextEditingController();
  final _parser = AiParserService();
  final _repository = TaskRepository();

  void _capture() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final tasks = _parser.parse(text);
    _repository.clear();
    _repository.addAll(tasks);
    _controller.clear();

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Top3Screen(repository: _repository),
      ),
    );
  }

  void _voicePlaceholder() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Voice capture sẽ có ở bản sau')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('3Next')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Capture less. Think less. Know what to do next.',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              maxLines: 4,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText:
                    'VD: Thứ Sáu nộp báo cáo, sửa phần 3 và bổ sung biểu đồ. '
                    'Mua sách ở Fahasa.',
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _voicePlaceholder,
                    icon: const Icon(Icons.mic),
                    label: const Text('Ghi âm'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _capture,
                    icon: const Icon(Icons.bolt),
                    label: const Text('Capture'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

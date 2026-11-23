import '../models/task.dart';

/// Mock stand-in for the real LLM-based extraction (to be swapped for an
/// actual API call once the team picks a provider). Splits raw input into
/// tasks using punctuation and flags deadline/urgency from keywords so the
/// rest of the app (ranking, Top 3, confirm flow) can be built and demoed
/// without needing an API key yet.
class AiParserService {
  static const _deadlineKeywords = {
    'hôm nay': Priority.high,
    'gấp': Priority.high,
    'ngay': Priority.high,
    'thứ hai': Priority.medium,
    'thứ ba': Priority.medium,
    'thứ tư': Priority.medium,
    'thứ năm': Priority.medium,
    'thứ sáu': Priority.medium,
    'thứ bảy': Priority.medium,
    'chủ nhật': Priority.medium,
    'ngày mai': Priority.medium,
    'tuần sau': Priority.low,
  };

  List<Task> parse(String rawInput) {
    final chunks = rawInput
        .split(RegExp(r'[.,;\n]'))
        .map((c) => c.trim())
        .where((c) => c.isNotEmpty)
        .toList();

    return List.generate(chunks.length, (i) {
      final chunk = chunks[i];
      final lower = chunk.toLowerCase();

      String? deadlineLabel;
      var priority = Priority.medium;

      for (final entry in _deadlineKeywords.entries) {
        if (lower.contains(entry.key)) {
          deadlineLabel = entry.key;
          priority = entry.value;
          break;
        }
      }

      return Task(
        id: '${DateTime.now().microsecondsSinceEpoch}_$i',
        title: chunk,
        deadlineLabel: deadlineLabel,
        priority: priority,
      );
    });
  }
}

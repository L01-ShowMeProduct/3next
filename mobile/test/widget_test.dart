import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('Capture screen shows input and Capture button', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ThreeNextApp());

    expect(find.text('3Next'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Capture'), findsOneWidget);
  });

  testWidgets('Capturing text navigates to Top 3 screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ThreeNextApp());

    await tester.enterText(
      find.byType(TextField),
      'Thứ Sáu nộp báo cáo, mua sách ở Fahasa',
    );
    await tester.tap(find.text('Capture'));
    await tester.pumpAndSettle();

    expect(find.text('Top 3 việc tiếp theo'), findsOneWidget);
  });
}

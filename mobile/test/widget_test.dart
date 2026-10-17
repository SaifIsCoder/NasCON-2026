import 'package:flutter_test/flutter_test.dart';
import 'package:nascon_mobile/app.dart';

void main() {
  testWidgets('LeagueHubApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const LeagueHubApp());
    await tester.pumpAndSettle();

    // Verify that the title and bottom navigation render.
    expect(find.text('LeagueHub'), findsOneWidget);
    expect(find.text('Fixtures'), findsWidgets);
  });
}

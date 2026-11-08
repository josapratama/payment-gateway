import 'package:flutter_test/flutter_test.dart';
import 'package:paygateway_forwarder/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const PayGatewayApp());
    expect(find.text('PayGateway Forwarder'), findsOneWidget);
  });
}

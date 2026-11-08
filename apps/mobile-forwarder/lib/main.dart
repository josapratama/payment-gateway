import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:notification_listener_service/notification_event.dart';
import 'package:notification_listener_service/notification_listener_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PayGatewayApp());
}

class PayGatewayApp extends StatelessWidget {
  const PayGatewayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PayGateway Sync',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF090D16),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3B82F6),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF131B2E),
        ),
        useMaterial3: true,
      ),
      home: const ForwarderHomeScreen(),
    );
  }
}

class ForwardLog {
  final DateTime time;
  final String app;
  final String title;
  final String text;
  final bool success;
  final String message;

  ForwardLog({
    required this.time,
    required this.app,
    required this.title,
    required this.text,
    required this.success,
    required this.message,
  });
}

class ForwarderHomeScreen extends StatefulWidget {
  const ForwarderHomeScreen({super.key});

  @override
  State<ForwarderHomeScreen> createState() => _ForwarderHomeScreenState();
}

class _ForwarderHomeScreenState extends State<ForwarderHomeScreen> {
  bool _isListening = true;
  bool _hasPermission = false;
  bool _isLoading = false;

  final TextEditingController _urlController = TextEditingController(
    text: 'https://pay.josapratama.com/api/v1/mutations',
  );
  final TextEditingController _keyController = TextEditingController(
    text: 'pay-admin-secret-2026',
  );

  StreamSubscription<ServiceNotificationEvent>? _subscription;
  final List<ForwardLog> _logs = [];

  final Map<String, bool> _appFilters = {
    'DANA': true,
    'GoPay': true,
    'BCA': true,
    'Mandiri': true,
    'BRI': true,
  };

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _checkPermission();
    _startListening();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _urlController.dispose();
    _keyController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _urlController.text = prefs.getString('server_url') ??
          'https://pay.josapratama.com/api/v1/mutations';
      _keyController.text =
          prefs.getString('admin_key') ?? 'pay-admin-secret-2026';
      _isListening = prefs.getBool('is_listening') ?? true;
      for (final key in _appFilters.keys) {
        _appFilters[key] = prefs.getBool('filter_$key') ?? true;
      }
    });
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', _urlController.text.trim());
    await prefs.setString('admin_key', _keyController.text.trim());
    await prefs.setBool('is_listening', _isListening);
    for (final entry in _appFilters.entries) {
      await prefs.setBool('filter_${entry.key}', entry.value);
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pengaturan berhasil disimpan!'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    }
  }

  Future<void> _checkPermission() async {
    final status = await NotificationListenerService.isPermissionGranted();
    setState(() {
      _hasPermission = status;
    });
  }

  Future<void> _requestPermission() async {
    final granted = await NotificationListenerService.requestPermission();
    setState(() {
      _hasPermission = granted;
    });
  }

  void _startListening() {
    _subscription?.cancel();
    try {
      _subscription = NotificationListenerService.notificationsStream.listen(
        (event) {
          if (!_isListening) return;
          _handleIncomingNotification(event);
        },
        onError: (err) {
          debugPrint('Notification stream error: $err');
        },
      );
    } catch (e) {
      debugPrint('Error starting notification listener: $e');
    }
  }

  bool _isRelevantApp(String packageName, String title, String content) {
    final lowerPkg = packageName.toLowerCase();
    final lowerText = '$title $content'.toLowerCase();

    // Check active filters
    if ((_appFilters['DANA'] ?? true) && (lowerPkg.contains('dana') || lowerText.contains('dana'))) return true;
    if ((_appFilters['GoPay'] ?? true) && (lowerPkg.contains('gojek') || lowerPkg.contains('gopay') || lowerText.contains('gopay'))) return true;
    if ((_appFilters['BCA'] ?? true) && (lowerPkg.contains('bca') || lowerText.contains('bca'))) return true;
    if ((_appFilters['Mandiri'] ?? true) && (lowerPkg.contains('mandiri') || lowerText.contains('livin'))) return true;
    if ((_appFilters['BRI'] ?? true) && (lowerPkg.contains('bri') || lowerText.contains('brimo'))) return true;

    // Check general money keywords
    if (lowerText.contains('transfer') ||
        lowerText.contains('terima') ||
        lowerText.contains('uang masuk') ||
        lowerText.contains('rp ')) {
      return true;
    }

    return false;
  }

  Future<void> _handleIncomingNotification(ServiceNotificationEvent event) async {
    final title = event.title;
    final content = event.content;
    final pkg = event.packageName;

    // Ignore empty or irrelevant notifications
    if (content.isEmpty && title.isEmpty) return;
    if (!_isRelevantApp(pkg, title, content)) return;

    final targetUrl = _urlController.text.trim();
    final key = _keyController.text.trim();

    try {
      final uri = Uri.parse(targetUrl.contains('?')
          ? '$targetUrl&key=$key'
          : '$targetUrl?key=$key');

      final res = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key,
        },
        body: jsonEncode({
          'appName': pkg,
          'title': title,
          'text': content,
          'rawPayload': '$title - $content',
        }),
      );

      final isOk = res.statusCode == 200;
      final body = jsonDecode(res.body);

      setState(() {
        _logs.insert(
          0,
          ForwardLog(
            time: DateTime.now(),
            app: _prettifyPackage(pkg),
            title: title,
            text: content,
            success: isOk,
            message: body['message'] ?? 'Status: ${res.statusCode}',
          ),
        );
      });
    } catch (e) {
      setState(() {
        _logs.insert(
          0,
          ForwardLog(
            time: DateTime.now(),
            app: _prettifyPackage(pkg),
            title: title,
            text: content,
            success: false,
            message: 'Gagal kirim: $e',
          ),
        );
      });
    }
  }

  String _prettifyPackage(String pkg) {
    final lower = pkg.toLowerCase();
    if (lower.contains('dana')) return 'DANA';
    if (lower.contains('gojek') || lower.contains('gopay')) return 'GoPay';
    if (lower.contains('bca')) return 'BCA';
    if (lower.contains('mandiri')) return 'Mandiri';
    if (lower.contains('bri')) return 'BRI';
    return pkg.split('.').last;
  }

  Future<void> _sendTestNotification() async {
    setState(() => _isLoading = true);
    final targetUrl = _urlController.text.trim();
    final key = _keyController.text.trim();

    try {
      final uri = Uri.parse(targetUrl.contains('?')
          ? '$targetUrl&key=$key'
          : '$targetUrl?key=$key');

      final res = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key,
        },
        body: jsonEncode({
          'appName': 'id.dana',
          'title': 'Uang Masuk',
          'text': 'Kamu berhasil menerima uang Rp 50.000 dari Tester Flutter',
        }),
      );

      final isOk = res.statusCode == 200;
      final body = jsonDecode(res.body);

      setState(() {
        _logs.insert(
          0,
          ForwardLog(
            time: DateTime.now(),
            app: 'DANA (Test)',
            title: 'Uang Masuk',
            text: 'Kamu berhasil menerima uang Rp 50.000 dari Tester Flutter',
            success: isOk,
            message: body['message'] ?? 'OK',
          ),
        );
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isOk
                ? 'Test berhasil terkirim ke Server!'
                : 'Server menolak: ${res.body}'),
            backgroundColor: isOk ? const Color(0xFF10B981) : Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Koneksi Gagal: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('HH:mm:ss');

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.sync_alt, color: Color(0xFF3B82F6), size: 24),
            SizedBox(width: 8),
            Text(
              'PayGateway Forwarder',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _checkPermission();
              setState(() {});
            },
            tooltip: 'Cek Status Izin',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Permission & Status Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF131B2E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _hasPermission
                      ? const Color(0xFF10B981).withValues(alpha: 0.3)
                      : Colors.amber.withValues(alpha: 0.4),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Icon(
                              _hasPermission
                                  ? Icons.check_circle
                                  : Icons.warning_amber_rounded,
                              color: _hasPermission
                                  ? const Color(0xFF10B981)
                                  : Colors.amber,
                              size: 24,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _hasPermission
                                        ? 'Akses Notifikasi Aktif'
                                        : 'Izin Notifikasi Belum Aktif',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  Text(
                                    _hasPermission
                                        ? 'Aplikasi siap menangkap mutasi HP'
                                        : 'Ketuk tombol untuk mengizinkan',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade400,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (!_hasPermission)
                        ElevatedButton(
                          onPressed: _requestPermission,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text('Beri Izin'),
                        ),
                    ],
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Auto-Forward Mutasi',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            'Teruskan notifikasi uang masuk ke server',
                            style: TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                        ],
                      ),
                      Switch(
                        value: _isListening,
                        activeThumbColor: const Color(0xFF10B981),
                        onChanged: (val) {
                          setState(() => _isListening = val);
                          _saveSettings();
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // App Filter Chips
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF131B2E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.filter_list, color: Color(0xFF3B82F6), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Aplikasi yang Dipantau:',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: _appFilters.keys.map((app) {
                      final isSelected = _appFilters[app] ?? true;
                      return FilterChip(
                        label: Text(app, style: const TextStyle(fontSize: 12)),
                        selected: isSelected,
                        selectedColor: const Color(0xFF3B82F6).withValues(alpha: 0.3),
                        checkmarkColor: const Color(0xFF60A5FA),
                        backgroundColor: const Color(0xFF090D16),
                        side: BorderSide(
                          color: isSelected
                              ? const Color(0xFF3B82F6)
                              : const Color(0xFF1E293B),
                        ),
                        onSelected: (val) {
                          setState(() => _appFilters[app] = val);
                          _saveSettings();
                        },
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Server Config Section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF131B2E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.dns, color: Color(0xFF3B82F6), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Konfigurasi Endpoint Server',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _urlController,
                    decoration: InputDecoration(
                      labelText: 'Server Webhook URL',
                      labelStyle:
                          const TextStyle(color: Colors.grey, fontSize: 13),
                      filled: true,
                      fillColor: const Color(0xFF090D16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide:
                            const BorderSide(color: Color(0xFF1E293B)),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _keyController,
                    decoration: InputDecoration(
                      labelText: 'Admin Secret Key',
                      labelStyle:
                          const TextStyle(color: Colors.grey, fontSize: 13),
                      filled: true,
                      fillColor: const Color(0xFF090D16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide:
                            const BorderSide(color: Color(0xFF1E293B)),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isLoading ? null : _sendTestNotification,
                          icon: _isLoading
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                )
                              : const Icon(Icons.send, size: 16),
                          label: const Text('Test Kirim Mutasi'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF3B82F6),
                            side: const BorderSide(color: Color(0xFF3B82F6)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton.icon(
                        onPressed: _saveSettings,
                        icon: const Icon(Icons.save, size: 16),
                        label: const Text('Simpan'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Live Activity Feed
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.history, color: Colors.grey, size: 18),
                    const SizedBox(width: 6),
                    Text(
                      'Riwayat Notifikasi Forwarded (${_logs.length})',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
                if (_logs.isNotEmpty)
                  TextButton(
                    onPressed: () => setState(() => _logs.clear()),
                    child: const Text('Bersihkan Log',
                        style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ),
              ],
            ),
            const SizedBox(height: 8),

            if (_logs.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 40),
                decoration: BoxDecoration(
                  color: const Color(0xFF131B2E),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  children: [
                    Icon(Icons.inbox, size: 40, color: Colors.grey.shade600),
                    const SizedBox(height: 10),
                    const Text(
                      'Belum ada notifikasi yang ditangkap.',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Gunakan tombol "Test Kirim Mutasi" untuk mencoba.',
                      style: TextStyle(
                          color: Colors.grey.shade500, fontSize: 11),
                    ),
                  ],
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _logs.length,
                itemBuilder: (context, index) {
                  final log = _logs[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF131B2E),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: log.success
                            ? const Color(0xFF10B981).withValues(alpha: 0.3)
                            : Colors.red.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF3B82F6)
                                        .withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    log.app,
                                    style: const TextStyle(
                                      color: Color(0xFF60A5FA),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  dateFormat.format(log.time),
                                  style: TextStyle(
                                    color: Colors.grey.shade400,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                            Icon(
                              log.success ? Icons.check_circle : Icons.cancel,
                              color: log.success
                                  ? const Color(0xFF10B981)
                                  : Colors.red,
                              size: 16,
                            ),
                          ],
                        ),
                        if (log.title.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            log.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                        const SizedBox(height: 2),
                        Text(
                          log.text,
                          style: TextStyle(
                            color: Colors.grey.shade300,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          log.message,
                          style: TextStyle(
                            color: log.success
                                ? const Color(0xFF10B981)
                                : Colors.red.shade300,
                            fontSize: 10,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

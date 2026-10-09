/// Timestamps are shown 24-hour in local time, in JetBrains Mono, next to a relative age.
abstract final class TimeFormat {
  static String clock(DateTime t) {
    final l = t.toLocal();
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(l.hour)}:${two(l.minute)}:${two(l.second)}';
  }

  /// `9 s ago`, `4 min ago`, `2 h ago`, `3 d ago`.
  static String ago(DateTime t, {DateTime? now}) {
    final d = (now ?? DateTime.now()).difference(t);
    if (d.inSeconds < 5) return 'just now';
    if (d.inSeconds < 60) return '${d.inSeconds} s ago';
    if (d.inMinutes < 60) return '${d.inMinutes} min ago';
    if (d.inHours < 24) return '${d.inHours} h ago';
    return '${d.inDays} d ago';
  }
}

package expo.modules.perfprobe

import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.Debug
import android.os.PowerManager
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import android.os.Process as AndroidProcess

// Sonde de diagnostic de l'application (Paramètres › Mémoire).
// Lit ce que le JavaScript ne voit pas : la VRAIE mémoire du processus (lecteurs
// audio, vues, images, tas C++), les fils et fichiers ouverts, le temps processeur,
// et l'état du téléphone (chauffe, batterie, mémoire système, économie d'énergie).
// Aucune permission, aucune écriture : lecture seule des compteurs du système.
//
// Règles : jamais d'exception vers JavaScript (chaque bloc est protégé, une valeur
// illisible est simplement ABSENTE du résultat) ; tous les nombres sortent en Double.
// Les deux fonctions sont des AsyncFunction : elles ne bloquent pas le fil JavaScript
// (Debug.getMemoryInfo peut coûter quelques dizaines de ms sur les vieux téléphones).
class PerfProbeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PerfProbe")

    AsyncFunction("getStats") {
      collectStats()
    }

    // Événements poussés par le système (plus de relevé à la minute côté JavaScript) :
    //  - onDeviceChanged : batterie (%, température, branchée) et mode économie d'énergie,
    //    émis seulement quand une de ces valeurs change vraiment ;
    //  - onThermalChanged : statut thermique (API 29+).
    // Les écouteurs ne sont posés que tant que JavaScript écoute (OnStartObserving).
    Events("onDeviceChanged", "onThermalChanged")
    Function("supportsEvents") { true }

    OnStartObserving { startObserving() }
    OnStopObserving { stopObserving() }
    OnDestroy { stopObserving() }

    // Les 10 fils qui ont le plus travaillé depuis le début du processus.
    AsyncFunction("getThreadCpu") {
      collectThreadCpu()
    }
  }

  private var receiver: BroadcastReceiver? = null
  private var thermalListener: Any? = null
  private var lastSig: String? = null

  private fun emitDevice(battery: Intent?) {
    safe {
      val ctx = appContext.reactContext ?: return@safe
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as? PowerManager
      val out = LinkedHashMap<String, Any>()
      if (battery != null) {
        val level = battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        if (level >= 0 && scale > 0) out["batteryPct"] = level * 100.0 / scale
        val temp = battery.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
        if (temp != Int.MIN_VALUE) out["batteryTempC"] = temp / 10.0
        out["batteryPlugged"] = battery.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0
      }
      if (pm != null) out["isPowerSaveMode"] = pm.isPowerSaveMode
      // Le système rediffuse la batterie à chaque petit changement de tension : on ne
      // réveille JavaScript que si le niveau (entier), la température, la prise ou
      // l'économie d'énergie ont changé.
      val sig = "${(out["batteryPct"] as? Double)?.toInt()}|${out["batteryTempC"]}|${out["batteryPlugged"]}|${out["isPowerSaveMode"]}"
      if (sig == lastSig) return@safe
      lastSig = sig
      sendEvent("onDeviceChanged", out)
    }
  }

  private fun startObserving() {
    stopObserving()
    val ctx = appContext.reactContext ?: return
    safe {
      val r = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
          if (intent?.action == Intent.ACTION_BATTERY_CHANGED) {
            emitDevice(intent)
          } else {
            // Économie d'énergie : on relit aussi la batterie (diffusion collante).
            emitDevice(ctx.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)))
          }
        }
      }
      val filter = IntentFilter()
      filter.addAction(Intent.ACTION_BATTERY_CHANGED)
      filter.addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED)
      // La diffusion collante renvoie l'état courant : premier événement tout de suite.
      val sticky = ctx.registerReceiver(r, filter)
      receiver = r
      lastSig = null
      emitDevice(sticky)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      safe {
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val l = PowerManager.OnThermalStatusChangedListener { status ->
          sendEvent("onThermalChanged", mapOf("thermalStatus" to status.toDouble()))
        }
        pm?.addThermalStatusListener(l)
        thermalListener = l
        pm?.let { sendEvent("onThermalChanged", mapOf("thermalStatus" to it.currentThermalStatus.toDouble())) }
      }
    }
  }

  private fun stopObserving() {
    val ctx = appContext.reactContext
    safe { receiver?.let { ctx?.unregisterReceiver(it) } }
    receiver = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      safe {
        val pm = ctx?.getSystemService(Context.POWER_SERVICE) as? PowerManager
        (thermalListener as? PowerManager.OnThermalStatusChangedListener)?.let { pm?.removeThermalStatusListener(it) }
      }
    }
    thermalListener = null
  }

  private fun collectStats(): Map<String, Any> {
    val startedAt = SystemClock.elapsedRealtime()
    val out = LinkedHashMap<String, Any>()

    // 1. Mémoire du processus, comme `adb shell dumpsys meminfo` (en Ko).
    safe {
      val info = Debug.MemoryInfo()
      Debug.getMemoryInfo(info)
      out["totalPssKb"] = info.totalPss.toDouble()
      out["dalvikPssKb"] = info.dalvikPss.toDouble()
      out["nativePssKb"] = info.nativePss.toDouble()
      out["otherPssKb"] = info.otherPss.toDouble()
      // « App Summary » : Java / Natif / Code / Pile / Graphique / Autre privé / Système.
      val stats = info.memoryStats
      putNumber(out, "javaHeapKb", stats["summary.java-heap"])
      putNumber(out, "nativeHeapKb", stats["summary.native-heap"])
      putNumber(out, "codeKb", stats["summary.code"])
      putNumber(out, "stackKb", stats["summary.stack"])
      putNumber(out, "graphicsKb", stats["summary.graphics"])
      putNumber(out, "privateOtherKb", stats["summary.private-other"])
      putNumber(out, "systemKb", stats["summary.system"])
      putNumber(out, "swapPssKb", stats["summary.total-swap"])
    }

    // 2. Tas natif (C++) et tas Java vus de l'intérieur du processus.
    safe {
      out["nativeHeapAllocatedKb"] = (Debug.getNativeHeapAllocatedSize() / 1024L).toDouble()
      out["nativeHeapSizeKb"] = (Debug.getNativeHeapSize() / 1024L).toDouble()
    }
    safe {
      val rt = Runtime.getRuntime()
      out["javaUsedKb"] = ((rt.totalMemory() - rt.freeMemory()) / 1024L).toDouble()
      out["javaMaxKb"] = (rt.maxMemory() / 1024L).toDouble()
    }

    // 3. /proc/self/status : mémoire résidente, pic, échange, nombre de fils.
    safe {
      File("/proc/self/status").forEachLine { line ->
        val idx = line.indexOf(':')
        if (idx > 0) {
          val key = when (line.substring(0, idx)) {
            "VmRSS" -> "vmRssKb"
            "VmHWM" -> "vmHwmKb"
            "VmSwap" -> "vmSwapKb"
            "VmSize" -> "vmSizeKb"
            "Threads" -> "threads"
            else -> null
          }
          if (key != null) {
            val num = line.substring(idx + 1).trim().split(Regex("\\s+"))[0].toDoubleOrNull()
            if (num != null) out[key] = num
          }
        }
      }
    }

    // 4. Fichiers ouverts (un fichier / socket / lecteur de plus à chaque fuite).
    safe {
      val fds = File("/proc/self/fd").list()
      if (fds != null) out["openFds"] = fds.size.toDouble()
    }

    // 5. Mémoire du téléphone (libre, seuil d'alerte, limite du tas par app).
    safe {
      val am = appContext.reactContext?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      if (am != null) {
        val mi = ActivityManager.MemoryInfo()
        am.getMemoryInfo(mi)
        out["availMemMb"] = mi.availMem / 1048576.0
        out["totalMemMb"] = mi.totalMem / 1048576.0
        out["thresholdMb"] = mi.threshold / 1048576.0
        out["isLowMemory"] = mi.lowMemory
        out["memoryClassMb"] = am.memoryClass.toDouble()
        out["largeMemoryClassMb"] = am.largeMemoryClass.toDouble()
      }
    }

    // 6. Chauffe et économie d'énergie. Statut thermique (API 29+) :
    //    0 normal, 1 léger, 2 modéré, 3 sévère, 4 critique, 5 urgence, 6 arrêt.
    //    La « marge thermique » (API 30+) vaut 1,0 quand le bridage commence.
    safe {
      val pm = appContext.reactContext?.getSystemService(Context.POWER_SERVICE) as? PowerManager
      if (pm != null) {
        out["isPowerSaveMode"] = pm.isPowerSaveMode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          safe { out["thermalStatus"] = pm.currentThermalStatus.toDouble() }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          safe {
            val headroom = pm.getThermalHeadroom(10)
            if (!headroom.isNaN() && !headroom.isInfinite()) out["thermalHeadroom"] = headroom.toDouble()
          }
        }
      }
    }

    // 7. Batterie (diffusion « collante » : aucune permission, aucun récepteur gardé).
    safe {
      val battery = appContext.reactContext?.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
      if (battery != null) {
        val temp = battery.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
        if (temp != Int.MIN_VALUE) out["batteryTempC"] = temp / 10.0
        val level = battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        if (level >= 0 && scale > 0) out["batteryPct"] = level * 100.0 / scale
        out["batteryPlugged"] = battery.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0
      }
    }

    // 8. Processeur : temps de calcul cumulé du processus (tous fils, tous cœurs),
    //    durée de vie du processus et horloge de ce relevé. Entre deux relevés,
    //    Δcpu ÷ Δhorloge = part d'UN cœur utilisée (100 % = un cœur plein).
    safe {
      out["pid"] = AndroidProcess.myPid().toDouble()
      out["cpuCores"] = Runtime.getRuntime().availableProcessors().toDouble()
      out["cpuTimeMs"] = AndroidProcess.getElapsedCpuTime().toDouble()
      val now = SystemClock.elapsedRealtime()
      out["atMs"] = now.toDouble()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        out["uptimeMs"] = (now - AndroidProcess.getStartElapsedRealtime()).toDouble()
      }
    }

    out["tookMs"] = (SystemClock.elapsedRealtime() - startedAt).toDouble()
    return out
  }

  // Temps de calcul cumulé de chaque fil (/proc/self/task/<tid>/{comm,stat}) : dit si le
  // fil JavaScript (mqt_js), le fil d'interface, RenderThread ou un lecteur audio
  // (ExoPlayer) chauffe. Renvoie les 10 premiers : [{ name, tid, cpuMs, isMain }].
  private fun collectThreadCpu(): List<Map<String, Any>> {
    val result = ArrayList<Map<String, Any>>()
    try {
      val ticksPerSecond = clockTicksPerSecond()
      val pid = AndroidProcess.myPid()
      val dirs = File("/proc/self/task").listFiles() ?: return result
      val rows = ArrayList<Triple<String, Int, Double>>()
      for (dir in dirs) {
        try {
          val tid = dir.name.toIntOrNull()
          if (tid != null) {
            val name = File(dir, "comm").readText().trim()
            val stat = File(dir, "stat").readText()
            // Le nom est entre parenthèses et peut contenir des espaces : on repart de la
            // DERNIÈRE parenthèse. Ensuite : état (champ 3), …, utime (14), stime (15).
            val close = stat.lastIndexOf(')')
            if (close >= 0) {
              val fields = stat.substring(close + 2).trim().split(' ')
              val utime = fields.getOrNull(11)?.toDoubleOrNull()
              val stime = fields.getOrNull(12)?.toDoubleOrNull()
              if (utime != null && stime != null) {
                rows.add(Triple(name, tid, (utime + stime) * 1000.0 / ticksPerSecond))
              }
            }
          }
        } catch (e: Throwable) {
          // Fil terminé entre-temps : on l'ignore.
        }
      }
      rows.sortByDescending { it.third }
      for (row in rows.take(10)) {
        result.add(
          mapOf(
            "name" to row.first,
            "tid" to row.second.toDouble(),
            "cpuMs" to row.third,
            "isMain" to (row.second == pid)
          )
        )
      }
    } catch (e: Throwable) {
      // Illisible : liste vide.
    }
    return result
  }

  // Un « tic » de /proc vaut 1/100 s sur Android (CLK_TCK), sauf surprise.
  private fun clockTicksPerSecond(): Double {
    return try {
      val v = Os.sysconf(OsConstants._SC_CLK_TCK).toDouble()
      if (v > 0.0) v else 100.0
    } catch (e: Throwable) {
      100.0
    }
  }

  private fun putNumber(out: MutableMap<String, Any>, key: String, raw: String?) {
    val n = raw?.trim()?.toDoubleOrNull()
    if (n != null) out[key] = n
  }

  private inline fun safe(block: () -> Unit) {
    try {
      block()
    } catch (e: Throwable) {
      // Valeur illisible sur ce téléphone : elle manque simplement au résultat.
    }
  }
}

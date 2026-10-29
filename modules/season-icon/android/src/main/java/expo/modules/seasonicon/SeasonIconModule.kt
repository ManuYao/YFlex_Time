package expo.modules.seasonicon

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Active UNE activity-alias de lanceur (déclarées par plugins/withSeasonIcons.js)
// et désactive les autres : c'est ce qui change l'icône de l'application.
class SeasonIconModule : Module() {
  private val variants = listOf("base", "spring", "summer", "autumn", "winter", "yearend", "halloween", "valentine")

  private fun component(ctx: Context, v: String) = ComponentName(ctx.packageName, "${ctx.packageName}.SeasonIcon_$v")

  private fun current(ctx: Context): String {
    val pm = ctx.packageManager
    for (v in variants) {
      val state = pm.getComponentEnabledSetting(component(ctx, v))
      if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
        (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && v == "base")
      ) return v
    }
    return "base"
  }

  override fun definition() = ModuleDefinition {
    Name("SeasonIcon")

    Function("getIcon") {
      val ctx = appContext.reactContext ?: return@Function "base"
      current(ctx)
    }

    // Renvoie true si l'icône a changé. Le nouvel alias est activé AVANT de
    // désactiver l'ancien ; DONT_KILL_APP évite de fermer l'application.
    Function("setIcon") { name: String ->
      val ctx = appContext.reactContext ?: return@Function false
      if (!variants.contains(name) || current(ctx) == name) return@Function false
      val pm = ctx.packageManager
      pm.setComponentEnabledSetting(component(ctx, name), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
      for (v in variants) {
        if (v != name) {
          pm.setComponentEnabledSetting(component(ctx, v), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
        }
      }
      true
    }
  }
}

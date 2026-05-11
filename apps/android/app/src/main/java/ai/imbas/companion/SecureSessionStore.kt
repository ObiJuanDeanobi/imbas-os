package ai.imbas.companion

import android.content.Context
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Private-preview secure store for the mobile session token.
 *
 * Uses an Android Keystore AES key so the raw imbas_mobile_* token is not kept in
 * plaintext SharedPreferences. This is intentionally small and dependency-free;
 * future production UX can migrate to androidx.security if desired.
 */
class SecureSessionStore(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("imbas_mobile_session", Context.MODE_PRIVATE)

    fun save(session: ImbasMobileSession) {
        val json = JSONObject()
            .put("serviceUrl", session.serviceUrl)
            .put("token", session.token)
            .put("deviceLabel", session.deviceLabel)
            .put("sessionId", session.sessionId)
            .put("createdAt", session.createdAt)
            .put("scopes", JSONArray(session.scopes))
            .toString()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val ciphertext = cipher.doFinal(json.toByteArray(Charsets.UTF_8))
        prefs.edit()
            .putString("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .apply()
    }

    fun load(): ImbasMobileSession? {
        val iv = prefs.getString("iv", null) ?: return null
        val ciphertext = prefs.getString("ciphertext", null) ?: return null
        return try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)))
            val json = JSONObject(String(cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP)), Charsets.UTF_8))
            val scopesJson = json.optJSONArray("scopes") ?: JSONArray()
            ImbasMobileSession(
                serviceUrl = json.optString("serviceUrl"),
                token = json.optString("token"),
                deviceLabel = json.optString("deviceLabel", "Android companion"),
                scopes = (0 until scopesJson.length()).mapNotNull { scopesJson.optString(it).ifBlank { null } },
                sessionId = json.optString("sessionId"),
                createdAt = json.optString("createdAt")
            )
        } catch (_: Exception) {
            clear()
            null
        }
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.secretKey?.let { return it }
        return KeyGenerator.getInstance("AES", "AndroidKeyStore").apply {
            init(
                android.security.keystore.KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or android.security.keystore.KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build()
            )
        }.generateKey()
    }

    companion object {
        private const val KEY_ALIAS = "imbas_mobile_session_key"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}

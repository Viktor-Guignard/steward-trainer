/* =========================================================================
   Steward Trainer — comptes & synchronisation (Supabase)
   -------------------------------------------------------------------------
   Principe : le local d'abord (offline-first).
   - localStorage reste la source de vérité pendant que tu joues.
   - La synchro se fait à l'ouverture de l'app et après chaque partie.
   - Sans connexion (ou sans compte), l'app fonctionne exactement comme avant.

   L'authentification (mots de passe, sessions, e-mails) est entièrement
   gérée par Supabase — aucun mot de passe n'est stocké ni manipulé ici.
   ========================================================================= */
window.Sync = (function () {
  const CFG = window.STEWARD_CONFIG || {};
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  let client = null;      // client Supabase
  let user = null;        // utilisateur connecté
  let ready = false;      // librairie chargée
  const listeners = [];   // callbacks de changement d'état

  const configured = () => !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);

  function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("script"));
      document.head.appendChild(s);
    });
  }

  /* ---- Fusion de deux progressions ----
     Règle : on ne perd jamais rien.
     - xp / streak / meilleurs scores : on garde le maximum
     - erreurs à réviser : union (dédupliquée par question)
     - mission du jour : faite si elle est faite d'un côté ou de l'autre    */
  function merge(a, b) {
    a = a || {}; b = b || {};
    const best = {};
    for (const k of new Set([...Object.keys(a.best || {}), ...Object.keys(b.best || {})])) {
      best[k] = Math.max((a.best || {})[k] || 0, (b.best || {})[k] || 0);
    }
    const errs = [];
    const seen = new Set();
    for (const e of [...(a.errors || []), ...(b.errors || [])]) {
      const key = ((e && e.item && e.item.q) || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      errs.push(e);
    }
    const newer = (x, y) => (String(x || "") > String(y || "") ? x : y);
    return {
      xp: Math.max(a.xp || 0, b.xp || 0),
      streak: Math.max(a.streak || 0, b.streak || 0),
      lastPlayDate: newer(a.lastPlayDate, b.lastPlayDate),
      dailyDone: newer(a.dailyDone, b.dailyDone),
      best,
      errors: errs.slice(-300),
      muted: a.muted !== undefined ? a.muted : !!b.muted,
    };
  }

  async function init() {
    if (!configured()) return false;
    try {
      await loadScript(CDN);
      client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      ready = true;
      const { data } = await client.auth.getSession();
      user = (data && data.session && data.session.user) || null;
      client.auth.onAuthStateChange((_evt, session) => {
        user = (session && session.user) || null;
        emit();
      });
      emit();
      return true;
    } catch (e) {
      ready = false;           // hors-ligne ou CDN bloqué : on reste en local
      return false;
    }
  }

  async function signUp(email, password) {
    if (!ready) throw new Error("Service indisponible (hors-ligne ?)");
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    // Si la confirmation e-mail est activée, il n'y a pas encore de session.
    return { needsConfirm: !data.session };
  }

  async function signIn(email, password) {
    if (!ready) throw new Error("Service indisponible (hors-ligne ?)");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function resetPassword(email) {
    if (!ready) throw new Error("Service indisponible (hors-ligne ?)");
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname,
    });
    if (error) throw error;
  }

  async function signOut() {
    if (ready && client) await client.auth.signOut();
    user = null;
    emit();
  }

  /* Récupère la progression distante et la fusionne avec la locale. */
  async function pull(localState) {
    if (!ready || !user) return null;
    const { data, error } = await client
      .from("progress").select("data").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return merge(localState, (data && data.data) || {});
  }

  /* Écrit la progression (déjà fusionnée) sur le compte. */
  async function push(state) {
    if (!ready || !user) return false;
    const { error } = await client.from("progress").upsert({
      user_id: user.id,
      data: state,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  }

  /* Fusion complète : distant → local → distant. Renvoie l'état fusionné. */
  async function syncNow(localState) {
    const merged = await pull(localState);
    if (!merged) return null;
    await push(merged);
    return merged;
  }

  return {
    init, signUp, signIn, signOut, resetPassword,
    pull, push, syncNow, merge,
    isConfigured: configured,
    isReady: () => ready,
    currentUser: () => user,
    email: () => (user && user.email) || null,
    onChange: (fn) => listeners.push(fn),
  };
})();

/* =========================================================================
   Steward Trainer — configuration du compte / synchronisation
   -------------------------------------------------------------------------
   Colle ici les deux valeurs de ton projet Supabase :
   Supabase → ton projet → Project Settings → API

   - SUPABASE_URL : "Project URL"      (https://xxxxx.supabase.co)
   - SUPABASE_ANON_KEY : la clé "anon public"

   La clé "anon public" est PUBLIQUE par conception : elle est faite pour
   vivre dans le code d'une app web. Ce qui protège tes données, c'est la
   règle de sécurité (RLS) posée côté base : chaque utilisateur ne peut lire
   et écrire QUE sa propre ligne. Ne colle jamais ici la clé "service_role".

   Tant que ces deux champs sont vides, l'app fonctionne normalement en
   local (sans compte, progression sur l'appareil uniquement).
   ========================================================================= */
window.STEWARD_CONFIG = {
  SUPABASE_URL: "https://duevcywvjotavhbpqhkq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ktxPu8ogMFIJX-euSgn94w_YFOxUQeA",
};

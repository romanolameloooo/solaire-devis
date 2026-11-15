# SolaDevis

Dimensionnement et devis PDF pour les installateurs solaires d'Afrique francophone.
L'installateur crée un compte, enregistre ses prix une fois, puis produit en 2 minutes un devis PDF à son nom.

Ce guide est écrit pour quelqu'un qui n'est pas développeur. Suivez les étapes dans l'ordre : comptez environ 30 minutes la première fois.

---

## Ce qu'il vous faut

- Un compte **Supabase** (gratuit) : https://supabase.com. C'est la base de données et la gestion des comptes.
- Un compte **Netlify** (gratuit, usage commercial autorisé) : https://netlify.com. C'est l'hébergement du site.
- Un compte **GitHub** (gratuit) : https://github.com. Netlify y récupère le code.
- Pour tester sur votre ordinateur : **Node.js 20 ou plus récent** (https://nodejs.org, version « LTS »).

---

## Étape 1 : créer le projet Supabase

1. Connectez-vous sur https://supabase.com/dashboard et cliquez sur **New project**.
2. Nom : `soladevis`. Choisissez un mot de passe de base de données (notez-le quelque part). Région : **West EU (Paris)** ou **Central EU (Frankfurt)**, les plus proches de Dakar.
3. Attendez 1 à 2 minutes que le projet soit prêt.

## Étape 2 : créer les tables (migrations)

1. Dans votre projet Supabase, menu de gauche : **SQL Editor**, puis **New query**.
2. Ouvrez le fichier `supabase/migrations/0001_schema.sql` de ce projet, copiez **tout** son contenu, collez-le dans l'éditeur, puis cliquez sur **Run**. Le message attendu est « Success. No rows returned ».
3. Recommencez avec `supabase/migrations/0002_storage.sql` (stockage des logos).

Ces deux fichiers créent les tables `profiles`, `catalog_items` et `quotes`, la sécurité (chaque installateur ne voit que ses données), la numérotation automatique des devis (DV-2026-0001…) et le blocage à la fin de l'essai.

## Étape 3 : régler l'authentification

Dans Supabase : **Authentication**, puis **URL Configuration**.

- **Site URL** : `http://localhost:3000` pour l'instant (vous la changerez à l'étape 6).
- **Redirect URLs** : ajoutez `http://localhost:3000/**`.

**Important : choisissez l'une des deux options ci-dessous, sinon personne ne pourra s'inscrire.** Le service d'email fourni par défaut par Supabase est réservé aux tests : il refuse rapidement les envois, et Supabase bloque alors l'inscription (message « email rate limit exceeded »).

- **Option simple** : **Authentication > Sign In / Providers > Email**, désactivez **Confirm email**. Les installateurs entrent directement dans l'app après l'inscription.
- **Option recommandée en production** : gardez la confirmation, et branchez votre propre service d'envoi (voir « Emails » plus bas). Il sert aussi pour « Mot de passe oublié ».

## Étape 4 : récupérer les clés

Dans Supabase : **Project Settings** (roue dentée), puis **API** (ou **API Keys**).

| Ce que vous voyez dans Supabase | Où le coller dans `.env.local` |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / `public` (ou « publishable key ») | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` (ou « secret key ») | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ La clé `service_role` donne un accès total à la base. Ne l'envoyez à personne et ne la mettez jamais dans une variable qui commence par `NEXT_PUBLIC_`.

## Étape 5 : lancer le site sur votre ordinateur

1. Dans le dossier du projet, copiez le fichier `.env.example` et renommez la copie en `.env.local`.
2. Ouvrez `.env.local` et remplissez les valeurs : les 3 clés Supabase, et `ADMIN_EMAIL` avec **votre** adresse email.
3. Ouvrez un terminal dans le dossier du projet et tapez :

   ```bash
   npm install
   ```

   puis :

   ```bash
   npm run dev
   ```

4. Ouvrez http://localhost:3000 dans votre navigateur. Créez un compte avec l'email que vous avez mis dans `ADMIN_EMAIL`.

## Étape 6 : mettre en ligne sur Netlify

1. Mettez le projet sur GitHub (dans GitHub : **New repository**, puis suivez les instructions « push an existing repository »). Le fichier `.env.local` n'est **pas** envoyé : c'est voulu, il contient vos clés.
2. Sur https://app.netlify.com : **Add new site > Import an existing project > GitHub**, puis choisissez le dépôt `soladevis`. Netlify reconnaît Next.js et lit les réglages dans `netlify.toml` : ne changez rien.
3. Avant de cliquer sur **Deploy**, ouvrez **Add environment variables** (ou, après coup, **Site configuration > Environment variables**) et ajoutez **toutes** les variables de votre `.env.local`, avec une différence : `NEXT_PUBLIC_SITE_URL` = votre adresse Netlify (par exemple `https://soladevis.netlify.app`, ou votre nom de domaine).
4. Cliquez sur **Deploy** et attendez 2 à 4 minutes.
5. Retournez dans Supabase, **Authentication > URL Configuration** :
   - **Site URL** : votre adresse Netlify (ex. `https://soladevis.netlify.app`) ;
   - **Redirect URLs** : ajoutez `https://soladevis.netlify.app/**` (gardez aussi celle de localhost si vous développez encore).

Après chaque modification d'une variable dans Netlify, redéployez : **Deploys > Trigger deploy > Deploy site**. Chaque envoi sur GitHub redéploie aussi automatiquement.

Pour utiliser votre propre nom de domaine : **Domain management > Add a domain**, puis suivez les instructions DNS. Netlify fournit le certificat HTTPS gratuitement. Pensez à mettre à jour `NEXT_PUBLIC_SITE_URL` et les adresses dans Supabase.

### Ce que ça coûte

- **Netlify** : l'offre gratuite suffit au lancement.
- **Supabase** : l'offre gratuite met le projet en pause après 7 jours sans aucune visite (il faut alors le relancer depuis le tableau de bord). Dès que vous avez des clients payants, passez en **Pro** (environ 25 $ par mois) : plus de pause, sauvegardes quotidiennes.

## Étape 7 : vous mettre administrateur

C'est la variable `ADMIN_EMAIL` qui donne l'accès à **/admin**. Mettez-y l'email de votre compte SolaDevis (plusieurs emails séparés par des virgules si besoin), en local dans `.env.local` et en ligne dans Netlify.

Connecté avec ce compte, vous voyez un lien **Administration** dans le menu (sur ordinateur), ou vous allez directement sur `/admin`. Pour tout autre compte, cette page n'existe pas (erreur 404).

---

## Gérer les abonnements

- À l'inscription, chaque compte reçoit **15 jours d'essai**.
- À la fin de l'essai, la création de nouveaux devis est bloquée. L'installateur peut toujours consulter, modifier et re-télécharger ses devis, et il voit un écran **Activer mon abonnement** avec votre lien de paiement (`NEXT_PUBLIC_PAYMENT_LINK`).
- Quand vous recevez un paiement : allez dans **/admin**, cherchez le compte, cliquez sur **Gérer**, choisissez la date de fin (1 mois, 3 mois, 6 mois, 1 an ou une date précise), puis **Activer**.
- Vous pouvez aussi redonner 7 jours d'essai à partir d'aujourd'hui (« Essai de 7 jours »), ou désactiver un compte.

Le blocage est appliqué dans la base de données elle-même, pas seulement dans l'interface. Un installateur ne peut pas modifier son propre abonnement.

### Brancher le paiement en ligne plus tard (PayDunya : Wave, Orange Money)

Tout est prévu pour l'ajouter sans tout refaire :

- `src/lib/billing/provider.ts` : ajouter un fournisseur `paydunya` qui crée la page de paiement et vérifie les notifications ;
- `src/app/api/webhooks/paydunya/route.ts` : la route qui recevra la confirmation de paiement est déjà en place ;
- `src/lib/billing/activate.ts` : la fonction `activateSubscription()` est celle qu'utilise déjà /admin.

## Emails

Supabase envoie les emails (confirmation d'inscription, mot de passe oublié) avec un service de test limité à quelques emails par heure. Avant d'ouvrir le site au public, configurez votre propre service d'envoi : **Project Settings > Authentication > SMTP Settings** (par exemple Resend ou Brevo, qui ont des offres gratuites). Vous pouvez aussi traduire les modèles d'emails en français dans **Authentication > Emails**.

## Avant la mise en ligne

### Mentions légales (obligatoire)

Les pages **Confidentialité** (`/confidentialite`) et **Conditions d'utilisation** (`/cgu`) sont prêtes, mais il manque vos informations d'éditeur. Tant qu'elles ne sont pas renseignées, elles s'affichent surlignées en orange sur ces pages. Ajoutez dans `.env.local` et dans Netlify :

| Variable | Exemple |
|---|---|
| `NEXT_PUBLIC_LEGAL_EDITEUR` | Soleil Digital SARL |
| `NEXT_PUBLIC_LEGAL_IMMATRICULATION` | SARL, NINEA 0012345 2G3, RCCM SN-DKR-2026-B-1234 |
| `NEXT_PUBLIC_LEGAL_ADRESSE` | Sacré-Cœur 3, Dakar, Sénégal |
| `NEXT_PUBLIC_LEGAL_EMAIL` | contact@votre-domaine.sn |

Ces textes sont un modèle sérieux, pas un avis juridique : faites-les relire par un juriste avant le lancement.

### Cookies

SolaDevis n'utilise que les cookies de connexion (strictement nécessaires) et une mesure d'audience **sans cookie** (Umami). Aucune bannière de consentement n'est donc nécessaire. Si un jour vous ajoutez Google Analytics, Meta Pixel ou un outil similaire, il faudra en ajouter une.

### Mesure d'audience

Gratuit avec Umami (sans cookie, conforme sans bannière) :

1. Créez un compte sur https://cloud.umami.is (offre gratuite).
2. **Settings > Websites > Add website** : indiquez votre domaine.
3. Copiez le **Website ID** et ajoutez-le dans Netlify sous `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, puis redéployez.

Seules les pages publiques (accueil, inscription, pages légales) sont mesurées, jamais l'intérieur de l'application. Tant que la variable est vide, rien n'est chargé.

### Anti-spam

Deux protections invisibles sont toujours actives sur l'inscription, la connexion et le mot de passe oublié : un champ piège que seuls les robots remplissent, et un délai minimal avant l'envoi. Pour une protection plus forte (recommandé si vous recevez de fausses inscriptions) :

1. Créez un widget gratuit sur https://dash.cloudflare.com, section **Turnstile**, en ajoutant votre domaine.
2. Dans Supabase, **Authentication > Attack Protection** : activez **Enable Captcha protection**, choisissez **Turnstile** et collez la **clé secrète**.
3. Dans Netlify, ajoutez `NEXT_PUBLIC_TURNSTILE_SITE_KEY` avec la **clé du site**, puis redéployez.

Faites les étapes 2 et 3 en même temps : si Supabase exige le CAPTCHA alors que le site ne l'affiche pas encore, plus personne ne pourra se connecter.

### HTTPS et sécurité

Netlify force le HTTPS automatiquement. Le site ajoute aussi les en-têtes de sécurité habituels (HSTS, protection contre l'affichage dans une iframe, etc.) dans `next.config.ts`.

### Partage sur les réseaux

Quand le lien du site est partagé (WhatsApp, Facebook, LinkedIn), une image d'aperçu générée automatiquement s'affiche (`src/app/opengraph-image.tsx`). Le plan du site (`/sitemap.xml`) et `robots.txt` sont générés automatiquement à partir de `NEXT_PUBLIC_SITE_URL` : pensez à la renseigner avec votre vrai domaine. Les pages privées (app, admin) ne sont jamais indexées.

## Personnaliser

| Quoi | Où |
|---|---|
| Prix affiché sur le site | variable `NEXT_PUBLIC_PRICE_LABEL` |
| Lien de paiement | variable `NEXT_PUBLIC_PAYMENT_LINK` |
| Numéro WhatsApp de support | variable `NEXT_PUBLIC_SUPPORT_WHATSAPP` |
| Appareils proposés en ajout rapide | `src/lib/calc/presets.ts` |
| Catalogue de départ d'un nouveau compte (sans prix) | fonction `handle_new_user` dans `supabase/migrations/0001_schema.sql` |
| Textes de la page d'accueil | `src/app/page.tsx` |

Chaque installateur règle lui-même, dans **Paramètres**, la TVA, la validité, les conditions et les réglages techniques (heures de soleil, rendement, batteries, marge onduleur, simultanéité).

---

## Pour les développeurs

```bash
npm run dev        # serveur de développement
npm test           # tests unitaires (moteur de calcul, formats, PDF)
npm run typecheck  # vérification TypeScript
npm run lint       # ESLint
npm run build      # build de production
```

- Stack : Next.js 16 (App Router), TypeScript, Tailwind CSS 4, composants dans le style shadcn/ui (`src/components/ui`), Supabase (Auth, Postgres avec RLS, Storage), jsPDF + autotable côté client.
- Moteur de calcul : `src/lib/calc/engine.ts` (fonctions pures, testées dans `engine.test.ts`).
- PDF : `src/lib/pdf/quote-pdf.ts`. `npm test` écrit un exemple dans `test-output/devis-exemple.pdf`.
- Protection des routes : `src/proxy.ts` (le « middleware » de Next.js 16).
- Le résultat du dimensionnement et les lignes sont figés dans chaque devis (`quotes.result`, `quotes.lines`) : modifier ses prix ou ses réglages ne change pas les anciens devis.

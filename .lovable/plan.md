## Mechanic Workshop Directory & Reviews

A community site where signed-in users can register mechanic workshops they know about, and everyone can leave ratings, reviews, and discussion comments — helping people find trustworthy mechanics and avoid bad ones.

### Core features

**Auth (Lovable Cloud)**
- Email/password sign up & login
- Google sign-in
- User profile (display name, avatar)

**Workshops directory (home page)**
- Searchable, sortable list of mechanic workshops
- Filter by city / specialty (e.g. brakes, electrical, bodywork)
- Each card shows: name, photo, average star rating, number of reviews, location
- Sort by: top rated, worst rated, most reviewed, newest

**Register a workshop** (any signed-in user)
- Form with: name, address/city, phone, website (optional), specialties (tags), description, photo upload
- Duplicate-name warning to avoid the same shop being added twice

**Workshop detail page**
- Full info, photos, map-friendly address
- Aggregate rating + breakdown (how many 1★, 2★, …)
- List of all reviews

**Reviews**
- 1–5 star rating + written review
- Service type tag (oil change, repair, diagnostic, etc.)
- One review per user per workshop (editable/deletable by author)

**Comments on reviews**
- Other users can reply/discuss any review (e.g. "same thing happened to me")
- Author can delete their own comments

**My account**
- See workshops I've added, reviews I've written, comments I've posted
- Edit profile

**Moderation basics**
- Report button on workshops, reviews, and comments
- Authors can edit/delete their own content

### Design direction
Clean, trustworthy, community-feel. Warm accent color (orange/amber for the "mechanic" feel), strong typography, prominent star ratings, plenty of whitespace. Mobile-first since many users will check this on a phone before visiting a shop.

### Pages
- `/` — Home: search + workshop grid
- `/workshops/$id` — Workshop detail with reviews & comments
- `/workshops/new` — Register a workshop (auth required)
- `/login` & `/signup`
- `/me` — My profile, my contributions

### Out of scope (can add later)
- Map view with pins
- Photo galleries per review
- Verified-mechanic badges / shop owner replies
- Multilingual UI (currently English; can add Spanish later if needed)
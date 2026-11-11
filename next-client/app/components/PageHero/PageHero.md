# PageHero

Description: The opening of every public page: Documentation, Contact, Terms and Privacy Policy. One left-aligned headline (`text-5xl md:text-7xl`, bold, with an optional muted italic tail), an intro line, an optional "← Back" button above and optional children below (the docs' search field, the contact email button). Keeps the four pages' heroes identical.

Props: `title`, `accent?`, `intro`, `showBack?`, `children?`, `className?`.

Dependencies: `Button`, `useRouter` (Back goes to the previous page).

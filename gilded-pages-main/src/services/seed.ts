// Realistic demo data. Every date is relative to "today", so overdue and
// due-soon states always look current. A seeded PRNG keeps it deterministic
// (identical on server and client render).
import type { Activity, Book, Favorite, LibraryData, Loan, Member, Notification, Reservation } from "./types";
import { addDays, isoDaysFromToday, startOfDay } from "@/utils/dates";
import { LOAN_PERIOD_DAYS } from "./loanRules";

export const DEMO_MEMBER_ID = "m1";
export const LIBRARIAN = { id: "staff-1", name: "Eleanor Hughes", title: "Head Librarian", email: "eleanor@pagenest.library" };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function coverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
}

type BookRow = [
  title: string,
  author: string,
  isbn: string,
  category: string,
  year: number,
  publisher: string,
  copies: number,
  keywords: string,
  description: string,
  language?: string,
];

const BOOK_ROWS: BookRow[] = [
  ["Project Hail Mary", "Andy Weir", "9780593135204", "Science Fiction", 2021, "Ballantine Books", 4, "space survival science first-contact humor", "A lone astronaut wakes with no memory aboard a ship on a last-chance mission to save Earth, and must science his way through an extraordinary alliance."],
  ["The Martian", "Andy Weir", "9780553418026", "Science Fiction", 2014, "Crown", 3, "space survival mars science humor", "Stranded on Mars after a dust storm, botanist Mark Watney must improvise, calculate and grow his way to survival."],
  ["Artemis", "Andy Weir", "9780553448122", "Science Fiction", 2017, "Crown", 2, "moon heist space science", "A smuggler living in the first city on the Moon is drawn into a conspiracy for control of the colony."],
  ["Dune", "Frank Herbert", "9780441172719", "Science Fiction", 1965, "Ace", 4, "desert politics empire ecology prophecy", "On the desert planet Arrakis, young Paul Atreides is swept into a struggle over the most valuable substance in the universe."],
  ["The Three-Body Problem", "Cixin Liu", "9780765382030", "Science Fiction", 2008, "Tor Books", 3, "first-contact physics china civilization", "A secret military project sends signals into space and receives an answer that will change humanity's future."],
  ["Neuromancer", "William Gibson", "9780441569595", "Science Fiction", 1984, "Ace", 2, "cyberpunk hacking artificial-intelligence future", "A washed-up hacker is hired for one last job in the sprawling matrix of cyberspace."],
  ["Hyperion", "Dan Simmons", "9780553283686", "Science Fiction", 1989, "Bantam Spectra", 2, "pilgrimage space-opera time mystery", "Seven pilgrims journey to the Time Tombs on Hyperion, each carrying a story and a secret."],
  ["Foundation", "Isaac Asimov", "9780553293357", "Science Fiction", 1951, "Bantam Spectra", 3, "empire future mathematics civilization", "As the Galactic Empire crumbles, a mathematician devises a plan to shorten the coming dark age."],
  ["Klara and the Sun", "Kazuo Ishiguro", "9780593318171", "Literary Fiction", 2021, "Knopf", 3, "artificial-intelligence love family future", "An Artificial Friend observes the human world from a store window, hoping to be chosen by a child."],
  ["Never Let Me Go", "Kazuo Ishiguro", "9781400078776", "Literary Fiction", 2005, "Vintage", 2, "memory friendship dystopia identity", "Three friends from an English boarding school slowly uncover the truth about their purpose."],
  ["The Midnight Library", "Matt Haig", "9780525559474", "Literary Fiction", 2020, "Viking", 4, "regret possibility life choices hope", "Between life and death lies a library whose books let Nora Seed try the lives she might have lived."],
  ["Norwegian Wood", "Haruki Murakami", "9780375704024", "Literary Fiction", 1987, "Vintage", 2, "memory love loss japan", "A nostalgic story of first love and loss set in late-1960s Tokyo."],
  ["Kafka on the Shore", "Haruki Murakami", "9781400079278", "Literary Fiction", 2002, "Vintage", 2, "surreal journey japan identity", "A runaway teenager and an old man who talks to cats are drawn together along mysterious paths."],
  ["Where the Crawdads Sing", "Delia Owens", "9780735219090", "Literary Fiction", 2018, "G.P. Putnam's Sons", 3, "nature mystery coming-of-age marsh", "The 'Marsh Girl' of a North Carolina town becomes the prime suspect in a local murder."],
  ["Circe", "Madeline Miller", "9780316556347", "Fantasy", 2018, "Little, Brown", 3, "mythology greek witch identity", "The banished witch daughter of Helios discovers her power on a solitary island."],
  ["The Song of Achilles", "Madeline Miller", "9780062060624", "Fantasy", 2011, "Ecco", 2, "mythology greek love war", "A retelling of the Trojan War through the bond between Achilles and Patroclus."],
  ["The Hobbit", "J.R.R. Tolkien", "9780547928227", "Fantasy", 1937, "Mariner Books", 4, "adventure dragon quest classic", "Bilbo Baggins is swept from his comfortable hole into a quest for a dragon's treasure."],
  ["The Name of the Wind", "Patrick Rothfuss", "9780756404741", "Fantasy", 2007, "DAW Books", 2, "magic music school legend", "Kvothe recounts how he grew from a gifted child into the most notorious wizard his world has seen."],
  ["Mistborn: The Final Empire", "Brandon Sanderson", "9780765350381", "Fantasy", 2006, "Tor Books", 3, "magic heist rebellion empire", "A street thief joins a crew planning the impossible: overthrowing an immortal emperor."],
  ["The Way of Kings", "Brandon Sanderson", "9780765365279", "Fantasy", 2010, "Tor Books", 2, "epic war magic honor", "On a storm-scoured world, a slave, a scholar and a highprince are drawn into an ancient conflict."],
  ["Life 3.0", "Max Tegmark", "9781101946596", "Artificial Intelligence", 2017, "Knopf", 2, "artificial-intelligence future ethics society", "How will artificial intelligence affect crime, war, justice, jobs and our very sense of being human?"],
  ["Superintelligence", "Nick Bostrom", "9780198739838", "Artificial Intelligence", 2014, "Oxford University Press", 2, "artificial-intelligence risk future strategy", "What happens when machines surpass humans in general intelligence?"],
  ["Human Compatible", "Stuart Russell", "9780525558613", "Artificial Intelligence", 2019, "Viking", 2, "artificial-intelligence ethics control future", "A leading AI researcher explains how to build machines that remain beneficial to humans."],
  ["The Alignment Problem", "Brian Christian", "9780393635829", "Artificial Intelligence", 2020, "W. W. Norton", 1, "artificial-intelligence ethics machine-learning values", "How machine learning systems learn values, and what happens when they learn the wrong ones."],
  ["The Pragmatic Programmer", "David Thomas & Andrew Hunt", "9780135957059", "Technology", 2019, "Addison-Wesley", 2, "software craft programming career", "Timeless advice for developers on writing flexible, maintainable software."],
  ["Clean Code", "Robert C. Martin", "9780132350884", "Technology", 2008, "Prentice Hall", 2, "software programming craft refactoring", "A handbook of agile software craftsmanship and writing code that reads well."],
  ["Deep Work", "Cal Newport", "9781455586691", "Self-Help", 2016, "Grand Central", 3, "focus productivity career attention", "Rules for focused success in a distracted world."],
  ["Atomic Habits", "James Clear", "9780735211292", "Self-Help", 2018, "Avery", 5, "habits productivity behavior change", "Tiny changes, remarkable results: a practical framework for building good habits."],
  ["Big Magic", "Elizabeth Gilbert", "9781594634710", "Self-Help", 2015, "Riverhead", 2, "creativity courage inspiration art", "An invitation to live a creative life beyond fear."],
  ["Range", "David Epstein", "9780735214484", "Psychology", 2019, "Riverhead", 2, "learning expertise career generalist", "Why generalists triumph in a specialized world."],
  ["Thinking, Fast and Slow", "Daniel Kahneman", "9780374533557", "Psychology", 2011, "Farrar, Straus and Giroux", 3, "behavior decisions bias mind", "A tour of the two systems that drive the way we think."],
  ["Quiet", "Susan Cain", "9780307352156", "Psychology", 2012, "Crown", 2, "personality introversion society behavior", "The power of introverts in a world that can't stop talking."],
  ["The Body Keeps the Score", "Bessel van der Kolk", "9780143127741", "Psychology", 2014, "Penguin", 2, "trauma healing mind body", "How trauma reshapes body and brain, and paths toward recovery."],
  ["Sapiens", "Yuval Noah Harari", "9780062316097", "History", 2011, "Harper", 4, "humanity civilization evolution society", "A brief history of humankind, from the Stone Age to the present."],
  ["Homo Deus", "Yuval Noah Harari", "9780062464316", "History", 2015, "Harper", 2, "future humanity technology artificial-intelligence", "A brief history of tomorrow: where humanity may be headed next."],
  ["A Brief History of Time", "Stephen Hawking", "9780553380163", "Science", 1988, "Bantam", 2, "physics cosmology universe time", "From the Big Bang to black holes, the nature of time and the universe."],
  ["Cosmos", "Carl Sagan", "9780345539434", "Science", 1980, "Ballantine Books", 2, "universe astronomy science wonder", "A journey through fifteen billion years of cosmic evolution."],
  ["The Gene", "Siddhartha Mukherjee", "9781476733524", "Science", 2016, "Scribner", 2, "genetics biology history medicine", "An intimate history of the gene, the fundamental unit of heredity."],
  ["Educated", "Tara Westover", "9780399590504", "Biography & Memoir", 2018, "Random House", 3, "education family resilience memoir", "A woman raised off the grid in Idaho teaches herself enough to reach Cambridge."],
  ["Becoming", "Michelle Obama", "9781524763138", "Biography & Memoir", 2018, "Crown", 3, "politics identity family memoir", "The former First Lady's deeply personal memoir."],
  ["The Silent Patient", "Alex Michaelides", "9781250301697", "Mystery & Thriller", 2019, "Celadon Books", 3, "psychological suspense therapy secret", "A famous painter shoots her husband and never speaks again. Her therapist is determined to find out why."],
  ["Gone Girl", "Gillian Flynn", "9780307588371", "Mystery & Thriller", 2012, "Crown", 2, "psychological suspense marriage secret", "On their fifth anniversary, Amy Dunne disappears, and her husband becomes the suspect."],
  ["The Seven Husbands of Evelyn Hugo", "Taylor Jenkins Reid", "9781501161933", "Historical Fiction", 2017, "Atria Books", 3, "hollywood love secret fame", "A reclusive Hollywood icon finally tells the truth about her glamorous, scandalous life."],
  ["Pride and Prejudice", "Jane Austen", "9780141439518", "Classics", 1813, "Penguin Classics", 3, "love society manners classic", "Elizabeth Bennet and Mr. Darcy navigate pride, prejudice and the marriage market."],
  ["1984", "George Orwell", "9780451524935", "Classics", 1949, "Signet Classic", 4, "dystopia surveillance politics classic", "Winston Smith dares to think for himself in a totalitarian surveillance state."],
  ["Brave New World", "Aldous Huxley", "9780060850524", "Classics", 1932, "Harper Perennial", 2, "dystopia society technology classic", "A engineered, pleasure-driven World State and the few who question it."],
  ["The Psychology of Money", "Morgan Housel", "9780857197689", "Business & Finance", 2020, "Harriman House", 3, "money behavior investing decisions", "Timeless lessons on wealth, greed and happiness."],
  ["Cien años de soledad", "Gabriel García Márquez", "9780307474728", "Classics", 1967, "Vintage Español", 2, "magical-realism family latin-america classic", "Siete generaciones de la familia Buendía en el pueblo mítico de Macondo.", "Spanish"],
  ["Le Petit Prince", "Antoine de Saint-Exupéry", "9782070612758", "Classics", 1943, "Gallimard", 2, "fable friendship childhood classic", "Un aviateur rencontre un petit prince venu d'une autre planète.", "French"],
];

// Books added to the catalog recently (index → days ago) to populate "New arrivals".
const RECENT_ADDITIONS: Record<number, number> = { 0: 12, 8: 20, 22: 6, 23: 9, 29: 3, 38: 15, 46: 2, 35: 25 };

interface MemberSeed {
  name: string;
  email: string;
  phone: string;
  joinedDaysAgo: number;
  status: "active" | "inactive";
  interests: string[];
}

const MEMBER_SEEDS: MemberSeed[] = [
  { name: "Sarah Chen", email: "sarah.chen@example.com", phone: "(555) 201-4417", joinedDaysAgo: 540, status: "active", interests: ["Science Fiction", "Artificial Intelligence", "Technology"] },
  { name: "John Okafor", email: "john.okafor@example.com", phone: "(555) 318-2290", joinedDaysAgo: 410, status: "active", interests: ["Self-Help", "Business & Finance", "Psychology"] },
  { name: "Maria Gonzalez", email: "maria.g@example.com", phone: "(555) 674-1180", joinedDaysAgo: 720, status: "active", interests: ["Literary Fiction", "Classics", "Historical Fiction"] },
  { name: "David Kim", email: "dkim@example.com", phone: "(555) 902-5521", joinedDaysAgo: 300, status: "active", interests: ["Fantasy", "Science Fiction"] },
  { name: "Aisha Rahman", email: "aisha.rahman@example.com", phone: "(555) 441-7763", joinedDaysAgo: 260, status: "active", interests: ["Science", "History", "Biography & Memoir"] },
  { name: "Tom Becker", email: "tom.becker@example.com", phone: "(555) 233-9087", joinedDaysAgo: 610, status: "active", interests: ["Mystery & Thriller", "Literary Fiction"] },
  { name: "Priya Patel", email: "priya.patel@example.com", phone: "(555) 780-3345", joinedDaysAgo: 190, status: "active", interests: ["Technology", "Artificial Intelligence", "Psychology"] },
  { name: "Lucas Moreau", email: "lucas.moreau@example.com", phone: "(555) 119-6620", joinedDaysAgo: 830, status: "active", interests: ["Classics", "Fantasy"] },
  { name: "Emma Walsh", email: "emma.walsh@example.com", phone: "(555) 556-0912", joinedDaysAgo: 150, status: "active", interests: ["Historical Fiction", "Mystery & Thriller"] },
  { name: "Noah Friedman", email: "noah.f@example.com", phone: "(555) 887-2034", joinedDaysAgo: 95, status: "active", interests: ["History", "Science"] },
  { name: "Grace Liu", email: "grace.liu@example.com", phone: "(555) 330-4478", joinedDaysAgo: 470, status: "active", interests: ["Psychology", "Self-Help", "Biography & Memoir"] },
  { name: "Omar Haddad", email: "omar.haddad@example.com", phone: "(555) 612-8859", joinedDaysAgo: 360, status: "inactive", interests: ["Business & Finance", "Technology"] },
  { name: "Hannah Schmidt", email: "hannah.s@example.com", phone: "(555) 748-1123", joinedDaysAgo: 680, status: "inactive", interests: ["Classics", "Literary Fiction"] },
  { name: "Mateo Rossi", email: "mateo.rossi@example.com", phone: "(555) 275-9914", joinedDaysAgo: 45, status: "active", interests: ["Fantasy", "Mystery & Thriller"] },
  { name: "Leo Martins", email: "leo.martins@example.com", phone: "(555) 164-3301", joinedDaysAgo: 2, status: "active", interests: ["Science Fiction", "Fantasy"] },
  { name: "Chloe Anderson", email: "chloe.a@example.com", phone: "(555) 509-6677", joinedDaysAgo: 5, status: "active", interests: [] },
];

export function buildSeedData(): LibraryData {
  const rand = mulberry32(20260923);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;
  const today = startOfDay();

  const books: Book[] = BOOK_ROWS.map((row, i) => {
    const [title, author, isbn, category, year, publisher, copies, keywords, description, language] = row;
    const addedDaysAgo = RECENT_ADDITIONS[i] ?? 120 + Math.floor(rand() * 600);
    return {
      id: `b${i + 1}`,
      title,
      author,
      isbn,
      description,
      category,
      keywords: keywords.split(" "),
      publicationYear: year,
      publisher,
      language: language ?? "English",
      coverImage: coverUrl(isbn),
      totalCopies: copies,
      availableCopies: copies,
      addedAt: isoDaysFromToday(-addedDaysAgo, 9),
    };
  });

  const members: Member[] = MEMBER_SEEDS.map((m, i) => ({
    id: `m${i + 1}`,
    name: m.name,
    email: m.email,
    phone: m.phone,
    membershipStatus: m.status,
    joinedAt: isoDaysFromToday(-m.joinedDaysAgo, 11),
    interests: m.interests,
  }));

  const loans: Loan[] = [];
  const openCount = new Map<string, number>();
  const bookByTitle = (title: string) => books.find((b) => b.title === title) as Book;
  let loanSeq = 1;

  const addLoan = (memberId: string, book: Book, borrowedDaysAgo: number, opts: { returnedAfter?: number; dueIn?: number; renewals?: number } = {}) => {
    const open = openCount.get(book.id) ?? 0;
    const isOpenLoan = opts.returnedAfter === undefined;
    if (isOpenLoan && open >= book.totalCopies) return false;
    const borrowed = addDays(today, -borrowedDaysAgo);
    borrowed.setHours(10 + Math.floor(rand() * 8), Math.floor(rand() * 60));
    const renewals = opts.renewals ?? 0;
    const due = opts.dueIn !== undefined ? addDays(today, opts.dueIn) : addDays(borrowed, LOAN_PERIOD_DAYS * (1 + renewals));
    due.setHours(18, 0, 0, 0);
    const returnedAt = isOpenLoan ? null : addDays(borrowed, opts.returnedAfter ?? 10).toISOString();
    if (isOpenLoan) openCount.set(book.id, open + 1);
    loans.push({
      id: `L-${String(loanSeq++).padStart(4, "0")}`,
      memberId,
      bookId: book.id,
      copyNumber: isOpenLoan ? open + 1 : 1 + Math.floor(rand() * book.totalCopies),
      borrowedAt: borrowed.toISOString(),
      dueDate: due.toISOString(),
      returnedAt,
      status: returnedAt ? "returned" : renewals > 0 ? "renewed" : "active",
      renewalCount: renewals,
    });
    return true;
  };

  // Demo member Sarah: clear sci-fi / AI / Andy Weir pattern for the recommender.
  const sarahHistory: [string, number, number][] = [
    ["The Martian", 150, 12], ["Artemis", 120, 13], ["Dune", 100, 16], ["The Three-Body Problem", 80, 12],
    ["Life 3.0", 62, 14], ["Neuromancer", 45, 9], ["Atomic Habits", 30, 11],
  ];
  for (const [title, ago, after] of sarahHistory) addLoan("m1", bookByTitle(title), ago, { returnedAfter: after });
  addLoan("m1", bookByTitle("Project Hail Mary"), 12, { dueIn: 2 });
  addLoan("m1", bookByTitle("Deep Work"), 17, { dueIn: -3 });
  addLoan("m1", bookByTitle("Klara and the Sun"), 3, { dueIn: 11 });

  // Hand-placed open loans so every status is represented on first load.
  const scripted: [string, string, number, number, number?][] = [
    ["m2", "Atomic Habits", 16, -2], ["m2", "The Psychology of Money", 9, 5],
    ["m3", "The Midnight Library", 13, 1], ["m3", "Pride and Prejudice", 20, -6],
    ["m4", "The Way of Kings", 26, -12], ["m4", "Mistborn: The Final Empire", 5, 9],
    ["m5", "Sapiens", 11, 3], ["m5", "The Gene", 4, 10],
    ["m6", "The Silent Patient", 18, -4], ["m6", "Gone Girl", 2, 12],
    ["m7", "The Alignment Problem", 8, 6], ["m7", "Clean Code", 30, -1, 1],
    ["m8", "1984", 12, 2], ["m9", "The Seven Husbands of Evelyn Hugo", 14, 0],
    ["m10", "A Brief History of Time", 6, 8], ["m11", "Thinking, Fast and Slow", 22, -8],
    ["m11", "Quiet", 7, 7], ["m14", "The Name of the Wind", 3, 11], ["m14", "The Hobbit", 15, -1],
    ["m3", "Circe", 1, 13], ["m9", "Where the Crawdads Sing", 10, 4], ["m2", "Deep Work", 4, 10],
    ["m6", "Project Hail Mary", 6, 8], ["m4", "Project Hail Mary", 9, 5], ["m10", "Sapiens", 2, 12],
  ];
  for (const [memberId, title, ago, dueIn, renewals] of scripted) {
    addLoan(memberId, bookByTitle(title), ago, renewals === undefined ? { dueIn } : { dueIn, renewals });
  }

  // Six months of returned-loan history for analytics and interest profiles.
  const historyMembers = members.filter((m) => !["m1", "m15", "m16"].includes(m.id));
  for (let i = 0; i < 190; i++) {
    const member = pick(historyMembers);
    const preferred = books.filter((b) => member.interests.includes(b.category));
    const book = preferred.length && rand() < 0.75 ? pick(preferred) : pick(books);
    const ago = 20 + Math.floor(Math.pow(rand(), 0.8) * 175);
    const late = rand() < 0.12;
    addLoan(member.id, book, ago, { returnedAfter: late ? 15 + Math.floor(rand() * 6) : 4 + Math.floor(rand() * 10) });
  }
  // Recent returns this week.
  for (const [memberId, title, ago, after] of [["m2", "Range", 12, 10], ["m5", "Cosmos", 15, 13], ["m8", "The Hobbit", 9, 7], ["m9", "Educated", 11, 9], ["m7", "Human Compatible", 14, 12]] as const) {
    addLoan(memberId, bookByTitle(title), ago, { returnedAfter: after });
  }

  for (const book of books) book.availableCopies = book.totalCopies - (openCount.get(book.id) ?? 0);

  const favorites: Favorite[] = [
    ["m1", "Hyperion", 20], ["m1", "Superintelligence", 9], ["m1", "Foundation", 4],
    ["m2", "Big Magic", 14], ["m3", "Norwegian Wood", 30], ["m4", "Circe", 6], ["m7", "Human Compatible", 11],
  ].map(([memberId, title, ago], i) => ({
    id: `f${i + 1}`,
    memberId: memberId as string,
    bookId: bookByTitle(title as string).id,
    createdAt: isoDaysFromToday(-(ago as number), 15),
  }));

  const reservations: Reservation[] = [
    { id: "r1", memberId: "m1", bookId: bookByTitle("The Alignment Problem").id, createdAt: isoDaysFromToday(-2, 13), status: "waiting" },
    { id: "r2", memberId: "m10", bookId: bookByTitle("The Way of Kings").id, createdAt: isoDaysFromToday(-5, 16), status: "waiting" },
    { id: "r3", memberId: "m3", bookId: bookByTitle("Project Hail Mary").id, createdAt: isoDaysFromToday(-1, 12), status: "waiting" },
  ];

  const activities: Activity[] = [];
  let actSeq = 1;
  const nowMs = Date.now();
  for (const loan of loans) {
    activities.push({ id: `a${actSeq++}`, type: "BORROW", memberId: loan.memberId, bookId: loan.bookId, timestamp: loan.borrowedAt });
    if (loan.returnedAt && new Date(loan.returnedAt).getTime() <= nowMs) {
      activities.push({ id: `a${actSeq++}`, type: "RETURN", memberId: loan.memberId, bookId: loan.bookId, timestamp: loan.returnedAt });
    }
  }
  for (const m of members.filter((m) => new Date(m.joinedAt).getTime() > nowMs - 60 * 86_400_000)) {
    activities.push({ id: `a${actSeq++}`, type: "MEMBER_JOINED", memberId: m.id, bookId: null, timestamp: m.joinedAt });
  }
  for (const b of books.filter((b) => new Date(b.addedAt).getTime() > nowMs - 30 * 86_400_000)) {
    activities.push({ id: `a${actSeq++}`, type: "BOOK_ADDED", memberId: null, bookId: b.id, timestamp: b.addedAt });
  }
  for (const r of reservations) {
    activities.push({ id: `a${actSeq++}`, type: "RESERVE", memberId: r.memberId, bookId: r.bookId, timestamp: r.createdAt });
  }
  activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const notifications: Notification[] = [
    { id: "n-seed-1", memberId: "m1", type: "RECOMMENDATION", title: "New picks for you", message: "Based on your reading history, we found 5 books you may enjoy.", createdAt: isoDaysFromToday(-1, 9), readAt: null },
    { id: "n-seed-2", memberId: "m1", type: "NEW_BOOK", title: "New arrival", message: "A new book matching your interests has been added: The Alignment Problem.", createdAt: isoDaysFromToday(-4, 14), readAt: null, bookId: bookByTitle("The Alignment Problem").id },
    { id: "n-seed-3", memberId: "m1", type: "RETURN_CONFIRMATION", title: "Return confirmed", message: "Thanks for returning Atomic Habits.", createdAt: isoDaysFromToday(-19, 16), readAt: isoDaysFromToday(-19, 17), bookId: bookByTitle("Atomic Habits").id },
    { id: "n-seed-4", memberId: "m1", type: "RESERVATION", title: "Reservation placed", message: "You're in the queue for The Alignment Problem. We'll let you know when it's ready.", createdAt: isoDaysFromToday(-2, 13), readAt: isoDaysFromToday(-2, 14) },
    { id: "n-seed-5", memberId: null, type: "SYSTEM", title: "Welcome to PageNest", message: "Daily checks run automatically each morning to flag due-soon and overdue loans.", createdAt: isoDaysFromToday(-7, 8), readAt: isoDaysFromToday(-7, 9) },
  ];

  return { books, members, loans, reservations, notifications, favorites, activities, lastAutomationRun: null };
}

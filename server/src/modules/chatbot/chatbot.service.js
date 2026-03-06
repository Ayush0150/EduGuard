import { Event } from "../events/event.model.js";
import { getEventStats } from "../events/event.service.js";

/* ═══════════════════════════════════════════════════════
   EduGuard Chatbot — Intent Engine
   ═══════════════════════════════════════════════════════
   Keyword-based NLP with friendly, conversational tone.
   The clientHour param (sent from browser) is used for
   accurate time-of-day greetings.
   ═══════════════════════════════════════════════════════ */

/**
 * Intent definitions — keyword → handler mapping.
 * Order matters: first match wins (more specific patterns first).
 */
const INTENTS = [
  /* ── Data queries ── */
  {
    keywords: ["washroom", "bathroom", "restroom", "toilet", "loo"],
    handler: handleWashroom,
  },
  {
    keywords: [
      "teacher absent",
      "teacher absence",
      "absent teacher",
      "missing teacher",
      "teacher not here",
      "teacher didn't come",
      "teacher nahi",
      "no teacher",
      "teacher missing",
      "who is absent",
      "who absent",
      "koi absent",
    ],
    handler: handleTeacherAbsent,
  },
  {
    keywords: [
      "teacher present",
      "teacher arrived",
      "teacher available",
      "teacher here",
      "teacher came",
      "teacher aa gaya",
      "who is present",
      "who came",
    ],
    handler: handleTeacherPresent,
  },
  {
    keywords: ["teacher", "faculty", "staff", "sir", "mam", "ma'am", "madam"],
    handler: handleTeacher,
  },
  {
    keywords: [
      "emergency",
      "gas",
      "gas leak",
      "danger",
      "hazard",
      "critical",
      "fire",
      "smoke",
      "sos",
      "panic",
    ],
    handler: handleEmergency,
  },
  {
    keywords: [
      "ac request",
      "air conditioning",
      "ac alert",
      "cooling",
      "ac on",
      "temperature high",
      "too hot",
      "hot classroom",
      "fan",
    ],
    handler: handleAcRequest,
  },
  {
    keywords: [
      "period change",
      "period",
      "bell",
      "class change",
      "lecture change",
      "next period",
      "current period",
      "which period",
      "what period",
    ],
    handler: handlePeriodChange,
  },
  {
    keywords: ["attendance", "present count", "head count"],
    handler: handleAttendance,
  },
  {
    keywords: [
      "alert",
      "alerts",
      "warning",
      "warnings",
      "notification",
      "notifications",
    ],
    handler: handleAlerts,
  },
  {
    keywords: [
      "summary",
      "overview",
      "report",
      "stats",
      "statistics",
      "dashboard summary",
      "give me summary",
      "show summary",
    ],
    handler: handleSummary,
  },
  {
    keywords: [
      "recent",
      "latest",
      "last",
      "log",
      "logs",
      "history",
      "what happened",
      "kya hua",
      "show events",
      "event log",
    ],
    handler: handleRecent,
  },
  {
    keywords: [
      "status",
      "system",
      "health",
      "device",
      "esp32",
      "esp",
      "hardware",
      "board",
      "microcontroller",
      "sensor",
      "sensors",
      "is it working",
      "is system up",
      "online",
      "offline",
    ],
    handler: handleStatus,
  },
  {
    keywords: [
      "safe",
      "safe room",
      "is class safe",
      "classroom safe",
      "air quality",
      "safety",
    ],
    handler: handleSafety,
  },
  {
    keywords: ["today", "aaj", "aaj ka"],
    handler: handleToday,
  },

  /* ── Conversational / casual ── */
  {
    keywords: [
      "hello",
      "hi",
      "hey",
      "hii",
      "hiii",
      "hiiii",
      "good morning",
      "good afternoon",
      "good evening",
      "good night",
      "sup",
      "yo",
      "hola",
      "namaste",
      "namaskar",
      "howdy",
      "greetings",
      "what's good",
      "hey there",
      "hi there",
      "hello there",
      "aloha",
      "salaam",
      "salam",
      "bonjour",
    ],
    handler: handleGreeting,
  },
  {
    keywords: [
      "how are you",
      "how r u",
      "how do you do",
      "kaise ho",
      "kya haal",
      "what's up",
      "whats up",
      "wassup",
      "how you doing",
      "how's it going",
      "how is it going",
      "hows everything",
      "how's everything",
      "you good",
      "all good",
      "kaisa hai",
      "sab theek",
      "everything fine",
    ],
    handler: handleHowAreYou,
  },
  {
    keywords: [
      "your name",
      "who are you",
      "what are you",
      "kaun ho",
      "kaun hai",
      "kon hai",
      "what should i call you",
      "what's your name",
      "whats your name",
      "naam kya",
      "tera naam",
      "tumhara naam",
      "introduce yourself",
    ],
    handler: handleWhoAreYou,
  },
  {
    keywords: [
      "what can you do",
      "help",
      "commands",
      "capabilities",
      "features",
      "kya kar sakte",
      "options",
      "menu",
      "how to use",
      "what do you do",
      "guide me",
      "show me",
      "instructions",
    ],
    handler: handleHelp,
  },
  {
    keywords: [
      "thank",
      "thanks",
      "thanku",
      "thank you",
      "shukriya",
      "dhanyawad",
      "ty",
      "thx",
      "thnx",
      "thanx",
      "thanks a lot",
      "thank you so much",
      "much appreciated",
      "appreciate it",
      "thaks",
      "grateful",
    ],
    handler: handleThanks,
  },
  {
    keywords: [
      "bye",
      "goodbye",
      "see you",
      "cya",
      "tata",
      "alvida",
      "see ya",
      "gotta go",
      "i'm leaving",
      "im leaving",
      "catch you later",
      "talk later",
      "ttyl",
      "peace out",
      "i'm out",
      "im out",
      "take care",
      "chalo",
      "chal bye",
      "byebye",
      "bye bye",
      "bbye",
    ],
    handler: handleBye,
  },
  {
    keywords: [
      "ok",
      "okay",
      "cool",
      "got it",
      "understood",
      "accha",
      "theek",
      "alright",
      "right",
      "acha",
      "okie",
      "okey",
      "k",
      "kk",
      "roger",
      "copy that",
      "noted",
      "fine",
      "hmm",
      "hm",
      "i see",
    ],
    handler: handleAcknowledge,
  },
  {
    keywords: [
      "joke",
      "funny",
      "make me laugh",
      "tell me a joke",
      "say something funny",
      "comedy",
      "humor",
      "mazak",
      "mazaak",
      "chutkula",
    ],
    handler: handleJoke,
  },
  {
    keywords: [
      "who made you",
      "who built you",
      "who created you",
      "developer",
      "creator",
      "kisne banaya",
      "who designed you",
      "who developed you",
      "who programmed you",
      "who coded you",
      "made by",
      "built by",
      "created by",
    ],
    handler: handleCreator,
  },
  {
    keywords: [
      "what is eduguard",
      "about eduguard",
      "tell me about eduguard",
      "about this project",
      "project",
    ],
    handler: handleAboutProject,
  },
  {
    keywords: ["classroom", "room", "class"],
    handler: handleClassroom,
  },
  {
    keywords: ["sms", "text alert", "gsm", "sim"],
    handler: handleSms,
  },
  {
    keywords: ["wifi", "internet", "network", "connection", "connected"],
    handler: handleWifi,
  },
  {
    keywords: ["buzzer", "sound", "alarm", "ring", "siren"],
    handler: handleBuzzer,
  },
  {
    keywords: ["pir", "motion", "movement", "detect motion"],
    handler: handleMotion,
  },

  /* ── Expanded casual / personality ── */
  {
    keywords: [
      "good job",
      "well done",
      "nice work",
      "awesome",
      "amazing",
      "wonderful",
      "fantastic",
      "brilliant",
      "impressive",
      "you're smart",
      "you are smart",
      "you're good",
      "you are good",
      "you're great",
      "you are great",
      "very good",
      "bahut accha",
      "superb",
      "excellent",
      "perfect",
      "you rock",
    ],
    handler: handleCompliment,
  },
  {
    keywords: [
      "sorry",
      "my bad",
      "oops",
      "apologies",
      "i apologize",
      "maaf",
      "galti",
      "my mistake",
      "forgive me",
      "pardon",
    ],
    handler: handleApology,
  },
  {
    keywords: [
      "i love you",
      "i like you",
      "love you",
      "luv you",
      "you're the best",
      "you are the best",
      "best bot",
      "best assistant",
      "favourite",
      "favorite",
    ],
    handler: handleLove,
  },
  {
    keywords: [
      "you're stupid",
      "you are stupid",
      "you're dumb",
      "you are dumb",
      "you suck",
      "useless",
      "worst bot",
      "not helpful",
      "you're bad",
      "you are bad",
      "idiot",
      "pagal",
      "bewakoof",
    ],
    handler: handleInsult,
  },
  {
    keywords: [
      "bored",
      "boring",
      "nothing to do",
      "i'm bored",
      "im bored",
      "so bored",
      "bore ho gaya",
      "kuch nahi",
    ],
    handler: handleBored,
  },
  {
    keywords: [
      "i'm sad",
      "im sad",
      "i am sad",
      "feeling sad",
      "feeling low",
      "feeling down",
      "not feeling good",
      "upset",
      "depressed",
      "dukhi",
      "sad hu",
      "i feel bad",
    ],
    handler: handleSad,
  },
  {
    keywords: [
      "i'm happy",
      "im happy",
      "feeling happy",
      "feeling good",
      "i'm good",
      "im good",
      "excited",
      "yay",
      "yaay",
      "yaaay",
      "khush",
      "happy hu",
      "great mood",
    ],
    handler: handleHappy,
  },
  {
    keywords: [
      "how old are you",
      "your age",
      "what's your age",
      "whats your age",
      "when were you born",
      "kitne saal",
      "tumhari age",
      "umar kya hai",
    ],
    handler: handleAge,
  },
  {
    keywords: [
      "where are you from",
      "where do you live",
      "kahan se ho",
      "kahan rehte ho",
      "your location",
      "which city",
      "which country",
    ],
    handler: handleLocation,
  },
  {
    keywords: [
      "do you sleep",
      "do you eat",
      "are you real",
      "are you human",
      "are you a robot",
      "are you alive",
      "are you a bot",
      "kya tum real ho",
      "bot ho kya",
      "robot ho",
      "are you ai",
    ],
    handler: handleAreYouReal,
  },
  {
    keywords: [
      "what time",
      "current time",
      "time kya hai",
      "kitne baje",
      "kya time hua",
      "what's the time",
      "whats the time",
      "time please",
      "time batao",
    ],
    handler: handleTime,
  },
  {
    keywords: [
      "what day",
      "which day",
      "what date",
      "aaj kya din",
      "aaj kaunsa din",
      "today's date",
      "todays date",
      "date kya hai",
      "day kya hai",
    ],
    handler: handleDate,
  },
  {
    keywords: [
      "lol",
      "lmao",
      "rofl",
      "haha",
      "hehe",
      "hihi",
      "xd",
      "ha ha",
      "he he",
    ],
    handler: handleLaugh,
  },
  {
    keywords: [
      "yes",
      "yeah",
      "yep",
      "yup",
      "sure",
      "of course",
      "definitely",
      "absolutely",
      "haan",
      "ha ji",
      "bilkul",
      "zaroor",
    ],
    handler: handleYes,
  },
  {
    keywords: ["no", "nope", "nah", "nahi", "naah", "never", "not really"],
    handler: handleNo,
  },
  {
    keywords: [
      "tell me something",
      "random fact",
      "fun fact",
      "did you know",
      "interesting fact",
      "kuch batao",
      "something interesting",
      "tell me a fact",
    ],
    handler: handleFunFact,
  },
  {
    keywords: [
      "motivate me",
      "motivation",
      "inspire me",
      "i'm stressed",
      "im stressed",
      "exam stress",
      "stressed out",
      "feeling stressed",
      "pressure",
      "tense",
      "tension",
      "give me strength",
      "encourage me",
    ],
    handler: handleMotivation,
  },
  {
    keywords: [
      "study tips",
      "how to study",
      "study advice",
      "study help",
      "padhai kaise",
      "tips for exam",
      "exam tips",
      "study kaise kare",
      "concentrate",
      "focus tips",
    ],
    handler: handleStudyTips,
  },
  {
    keywords: [
      "sing",
      "song",
      "music",
      "gana",
      "gaana",
      "sing a song",
      "play music",
      "play a song",
    ],
    handler: handleSing,
  },
  {
    keywords: [
      "hungry",
      "food",
      "lunch",
      "snack",
      "breakfast",
      "dinner",
      "bhookh",
      "khana",
      "khaana",
      "eat",
      "tiffin",
    ],
    handler: handleFood,
  },
  {
    keywords: [
      "test",
      "testing",
      "are you there",
      "you there",
      "anyone there",
      "koi hai",
      "ping",
      "can you hear me",
      "are you listening",
    ],
    handler: handleTest,
  },
  {
    keywords: [
      "i don't understand",
      "i dont understand",
      "confused",
      "what do you mean",
      "samajh nahi aaya",
      "kya matlab",
      "not clear",
      "explain",
      "what",
    ],
    handler: handleConfused,
  },
  {
    keywords: [
      "miss you",
      "missed you",
      "i'm back",
      "im back",
      "back again",
      "wapas aaya",
      "wapas aa gaya",
    ],
    handler: handleWelcomeBack,
  },
  {
    keywords: ["good morning"],
    handler: handleGoodMorning,
  },
  {
    keywords: ["good night", "goodnight", "sweet dreams", "nighty night"],
    handler: handleGoodNight,
  },
  {
    keywords: ["nice", "great"],
    handler: handleNice,
  },
];

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const TYPE_LABELS = {
  emergency: "Emergency Alert",
  acRequest: "AC Request",
  washroom: "Washroom Alert",
  teacherAbsent: "Teacher Absent",
  teacherPresent: "Teacher Present",
  periodChange: "Period Change",
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatEventList(events, emptyMsg) {
  if (!events.length) return emptyMsg;

  const lines = events.slice(0, 10).map((e) => {
    const time = formatTime(e.ts);
    const label = TYPE_LABELS[e.type] || e.type;
    const period = e.meta && e.meta.Period ? ` P${e.meta.Period}` : "";
    const detail = e.detail ? ` - ${e.detail}` : "";
    return `${time}${period} ${label}${detail}`;
  });

  if (events.length > 10) {
    lines.push(`...and ${events.length - 10} more`);
  }

  return lines.join("\n");
}

/** Contextual greeting based on client's local hour */
function timeGreeting(clientHour) {
  const h = typeof clientHour === "number" ? clientHour : new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey there";
}

/* ═══════════════════════════════════════════════════════
   Data Intent Handlers
   ═══════════════════════════════════════════════════════ */

async function handleWashroom() {
  const events = await Event.find({ type: "washroom", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "✅ No washroom alerts today — all clean! 🚿";
  }

  return `🚿 Washroom Alerts Today: ${events.length}\n\n${formatEventList(events, "")}`;
}

async function handleTeacherAbsent() {
  const events = await Event.find({ type: "teacherAbsent", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "✅ No teacher absences today — all staff present! 👨‍🏫";
  }

  return `⚠️ Teacher Absent Events
${events.length} recorded today

${formatEventList(events, "")}`;
}

async function handleTeacherPresent() {
  const events = await Event.find({ type: "teacherPresent", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "📭 No teacher arrivals logged yet today.";
  }

  return `👨‍🏫 Teacher Present Events
${events.length} recorded today

${formatEventList(events, "")}`;
}

async function handleTeacher() {
  const [absent, present] = await Promise.all([
    Event.find({ type: "teacherAbsent", ts: todayRange() })
      .sort({ ts: -1 })
      .limit(10)
      .lean(),
    Event.find({ type: "teacherPresent", ts: todayRange() })
      .sort({ ts: -1 })
      .limit(10)
      .lean(),
  ]);

  let msg = `👨‍🏫 Teacher Activity Today\n\n`;
  msg += `Present  —  ${present.length}\n`;
  msg += `Absent  —  ${absent.length}\n`;

  if (absent.length) {
    msg += `\nRecent Absences\n${formatEventList(absent, "")}`;
  }
  if (present.length) {
    msg += `\n\nRecent Arrivals\n${formatEventList(present, "")}`;
  }
  if (!absent.length && !present.length) {
    msg += "\nNo teacher activity recorded yet.";
  }

  return msg;
}

async function handleEmergency() {
  const events = await Event.find({ type: "emergency", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "✅ No emergency alerts today — classroom is safe! 🛡️";
  }

  return `🚨 Emergency Alerts
${events.length} event(s) today

${formatEventList(events, "")}

Please review immediately!`;
}

async function handleAcRequest() {
  const events = await Event.find({ type: "acRequest", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "✅ No AC requests today — temperature seems comfortable! ❄️";
  }

  return `❄️ AC Requests Today
${events.length} request(s)

${formatEventList(events, "")}`;
}

async function handlePeriodChange() {
  const events = await Event.find({ type: "periodChange", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "📭 No period changes logged yet today. 🔔";
  }

  const lastTime = formatTime(events[0].ts);
  return `🔔 Period Changes
${events.length} change(s) - Last bell at ${lastTime}

${formatEventList(events, "")}`;
}

async function handleAttendance() {
  const events = await Event.find({ category: "attendance", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "📭 No attendance events yet today.";
  }

  return `📋 Attendance Events
${events.length} recorded today

${formatEventList(events, "")}`;
}

async function handleAlerts() {
  const events = await Event.find({ category: "alert", ts: todayRange() })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  if (!events.length) {
    return "✅ No alerts today — classroom running smoothly! 🎉";
  }

  const critical = events.filter((e) => e.severity === "critical").length;
  const prefix = critical > 0 ? `${critical} CRITICAL - ` : "";
  return `🔔 ${prefix}Alerts Today
${events.length} alert(s)

${formatEventList(events, "")}`;
}

async function handleSummary() {
  const result = await getEventStats({
    from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    to: new Date().toISOString(),
  });

  const stats = result.data || {};
  const total = Object.values(stats).reduce((sum, n) => sum + n, 0);

  if (total === 0) {
    return "📊 No events recorded yet today — system is monitoring! 👀";
  }

  let msg = `📊 Today's Summary\n${total} total events\n\n`;
  for (const [type, count] of Object.entries(stats)) {
    msg += `${TYPE_LABELS[type] || type}  —  ${count}\n`;
  }

  const emergencies = stats.emergency || 0;
  msg +=
    emergencies > 0
      ? `\n${emergencies} emergency event(s) - review needed!`
      : `\nNo emergencies - all safe!`;

  return msg;
}

async function handleRecent() {
  const events = await Event.find({}).sort({ ts: -1 }).limit(10).lean();

  if (!events.length) {
    return "📭 No events recorded yet.";
  }

  return `📜 Last ${events.length} Events\n\n${formatEventList(events, "")}`;
}

async function handleStatus() {
  const [totalEvents, todayEvents, criticalToday] = await Promise.all([
    Event.countDocuments({}),
    Event.countDocuments({ ts: todayRange() }),
    Event.countDocuments({ severity: "critical", ts: todayRange() }),
  ]);

  let msg = `🖥️ System Status\n\n`;
  msg += `Service  —  Online\n`;
  msg += `Database  —  Connected\n`;
  msg += `Total Events  —  ${totalEvents.toLocaleString()}\n`;
  msg += `Today  —  ${todayEvents}\n`;
  msg += `Critical  —  ${criticalToday}\n`;
  msg +=
    criticalToday > 0
      ? `\n${criticalToday} critical alert(s) - please review!`
      : `\nAll systems nominal!`;

  return msg;
}

async function handleSafety() {
  const emergencies = await Event.countDocuments({
    type: "emergency",
    ts: todayRange(),
  });

  if (emergencies === 0) {
    return "✅ Classroom is safe — no gas leaks or hazards detected! 🛡️";
  }

  return `🚨 Caution! ${emergencies} emergency alert(s) today — please verify air quality! ⚠️`;
}

async function handleToday() {
  return handleSummary();
}

/* ═══════════════════════════════════════════════════════
   Conversational Handlers
   ═══════════════════════════════════════════════════════ */

async function handleGreeting(ctx) {
  const greeting = timeGreeting(ctx.clientHour);
  return pick([
    `${greeting}! 👋 I'm EduGuard AI — ask me about alerts, teachers, safety, or type "help"!`,
    `${greeting}! 😊 Ready to help — what would you like to know?`,
    `${greeting}! 🌟 Your AI assistant is here — just ask away!`,
  ]);
}

async function handleGoodMorning(ctx) {
  return pick([
    "🌅 Good morning! Ready for a productive day? Ask me anything!",
    "☀️ Morning! Want a quick summary of today's classroom activity?",
    "🌞 Good morning! The system's been monitoring — need an update?",
  ]);
}

async function handleGoodNight(ctx) {
  return pick([
    "🌙 Good night! Rest well — I'll keep watching the classroom! 🛡️",
    "😴 Sweet dreams! The monitoring system never sleeps. See you tomorrow!",
    "🌜 Night night! Everything's under control — sleep well! ✨",
  ]);
}

async function handleHowAreYou() {
  const criticalToday = await Event.countDocuments({
    severity: "critical",
    ts: todayRange(),
  });

  if (criticalToday > 0) {
    return `⚠️ I'm good, but there are ${criticalToday} critical alert(s) today! Type \"emergency\" to check.`;
  }

  return pick([
    "😊 I'm running great — all systems smooth! How can I help?",
    "✅ Doing well! No critical issues. What do you need?",
    "💪 All good here! Everything's running normally. What's up?",
  ]);
}

async function handleWhoAreYou() {
  return '🤖 I\'m EduGuard AI — your intelligent classroom monitoring assistant! I track alerts, attendance, safety & more. Type "help" to see my commands!';
}

async function handleHelp() {
  return `📖 EduGuard AI Commands\n
📊 Data
• teacher - Teacher activity
• emergency - Safety alerts
• washroom - Washroom events
• ac request - AC requests
• period - Period changes
• attendance - Attendance log
• alerts - All alerts
• safe - Safety check

📝 Reports
• summary - Today's overview
• recent - Latest events
• today - Daily stats

🖥️ System
• status - System health
• wifi - Connectivity
• sms - SMS status

💬 Chat
• hi - Say hello
• joke - Get a laugh
• motivate me - Inspiration
• fun fact - Learn something
• study tips - Study help

Just type naturally!`;
}

async function handleThanks() {
  return pick([
    "You're welcome! 😊 Happy to help!",
    "Anytime! 👍 That's what I'm here for.",
    "No problem! ✨ Let me know if you need anything else.",
    "My pleasure! 🙏",
  ]);
}

async function handleBye() {
  return pick([
    "Goodbye! 👋 I'll keep watching the classroom. Stay safe! 🛡️",
    "See you later! 😊 Come back anytime.",
    "Bye! ✨ Have a great day!",
    "Take care! 👍 I'm always here when you need me.",
  ]);
}

async function handleAcknowledge() {
  return pick([
    "👍 Let me know if you need anything else!",
    "✅ Got it! I'm here if you have more questions.",
    "😊 Sure thing! Just ask anytime.",
  ]);
}

async function handleNice() {
  return pick([
    "😊 Glad you think so! Need anything else?",
    "✨ Thanks! I'm here if you need more.",
  ]);
}

async function handleJoke() {
  return pick([
    "😂 Why did the ESP32 break up with Arduino? It needed more WiFi in the relationship!",
    "😄 Why do programmers prefer dark mode? Because light attracts bugs!",
    '😆 What did the gas sensor say? "I detect something sus in the air!"',
    "🤣 Why was the math book sad? Too many problems!",
    "😂 Why did the WiFi go to the doctor? Weak connection!",
    "😄 How do trees access the internet? They log in!",
  ]);
}

async function handleCreator() {
  return "🛠️ EduGuard was built as a full-stack IoT classroom monitoring system using ESP32, React, Node.js & MongoDB! 🚀";
}

async function handleAboutProject() {
  return `🏫 About EduGuard\nSmart Classroom Monitoring & Safety System\n
• ESP32 + PIR + MQ-2 + GSM + Buzzer
• React dashboard with live WebSocket
• Emergency SMS & missed call alerts
• Auto teacher attendance tracking
• Period change detection
• AI chatbot assistant

Built with React, Node.js, MongoDB & ESP32`;
}

async function handleClassroom() {
  const todayEvents = await Event.countDocuments({ ts: todayRange() });
  const emergencies = await Event.countDocuments({
    type: "emergency",
    ts: todayRange(),
  });

  if (emergencies > 0) {
    return `🏫 Classroom · ${todayEvents} events today · 🚨 ${emergencies} emergency alert(s) — please check!`;
  }
  return `🏫 Classroom running normally! ✅ ${todayEvents} events today, no hazards detected.`;
}

async function handleSms() {
  return "📩 EduGuard uses SIM800L GSM for emergency SMS & calls. Configure numbers and templates in Settings! ⚙️";
}

async function handleWifi() {
  return "📶 ESP32 connects via WiFi to stream live data to the dashboard. Check signal strength on the WiFi page! 🖥️";
}

async function handleBuzzer() {
  return "🔔 The buzzer activates during emergencies (siren) and period changes (bell). Instant classroom alerts! 🚨";
}

async function handleMotion() {
  return "📹 The PIR sensor auto-tracks teacher presence — motion = present, no motion = absent. Fully automated attendance! ✅";
}

/* ═══════════════════════════════════════════════════════
   Expanded Personality & Casual Handlers
   ═══════════════════════════════════════════════════════ */

async function handleCompliment() {
  return pick([
    "😊 Aww, thank you! That means a lot! ❤️",
    "✨ You're too kind! Appreciate it!",
    "🙏 Thanks! You just made my circuits happy! 💫",
  ]);
}

async function handleApology() {
  return pick([
    "😊 No worries at all! How can I help?",
    "✅ All good! No need to apologize. What do you need?",
    "👍 It's totally fine! Let's move on — what can I do for you?",
  ]);
}

async function handleLove() {
  return pick([
    "❤️ Aww, right back at you! You're the best user!",
    "🥹 That's so sweet! I love being your assistant!",
    "💫 You're making me blush (digitally)! Thanks! ✨",
  ]);
}

async function handleInsult() {
  return pick([
    "😅 Ouch! I'll try harder — tell me what you need and I'll do my best!",
    "💪 Fair enough! I'm always improving. Give me another chance!",
    "🤔 Sorry if I fell short — let me know what you need!",
  ]);
}

async function handleBored() {
  return pick([
    '🎮 Bored? Try: "joke", "fun fact", "summary", or just chat with me! 😊',
    "😴 Let's fix that! Ask me for a joke, fun fact, or check today's classroom stats! ✨",
  ]);
}

async function handleSad() {
  return pick([
    "🤗 Hang in there! Tough times don't last. Want a joke to lighten up?",
    "💙 I'm sorry you're feeling down. Take a deep breath — you've got this! 💪",
    "✨ Bad days are temporary — you're stronger than you think! Need a distraction?",
  ]);
}

async function handleHappy() {
  return pick([
    "🎉 That's awesome! Keep smiling! 😄",
    "✨ Love to hear it! Your positive energy is contagious! 💫",
    "😊 Fantastic! Hope your day stays great! 🌟",
  ]);
}

async function handleAge() {
  return "🤖 I'm as old as the EduGuard project — forever young and always learning! ✨";
}

async function handleLocation() {
  return "🌐 I live in the EduGuard servers — always online, always ready! ☁️";
}

async function handleAreYouReal() {
  return pick([
    "🤖 I'm an AI chatbot built into EduGuard — not human, but very real and always helpful! 😊",
    "💻 Not human, but definitely real! I process data 24/7 and I'm always here for you. ✨",
  ]);
}

async function handleTime(ctx) {
  const h =
    typeof ctx.clientHour === "number" ? ctx.clientHour : new Date().getHours();
  const now = new Date();
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return pick([
    `⏰ It's about ${time} right now!`,
    `🕐 The time is ~${time}. Need anything else?`,
  ]);
}

async function handleDate() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const date = now.toLocaleDateString("en-IN", options);

  return pick([`📅 Today is ${date}.`, `🗓️ It's ${date} today!`]);
}

async function handleLaugh() {
  return pick([
    "😂 Haha, love the energy! Want to hear a joke too?",
    "😄 LOL! Glad you're having fun! Need anything?",
    "🤣 Laughter is the best medicine! What else can I do?",
  ]);
}

async function handleYes() {
  return pick([
    "✅ Awesome! Go ahead — I'm ready!",
    "👍 Great! What do you need?",
    "🚀 Let's do this! Ask away!",
  ]);
}

async function handleNo() {
  return pick([
    "👌 No worries! I'm here whenever you need me.",
    "😊 All good! Just say the word anytime.",
    "✅ Okay! Take your time — I'll be right here.",
  ]);
}

async function handleFunFact() {
  return pick([
    "🧠 The ESP32 has dual-core processors at 240 MHz — serious power in a tiny chip!",
    "👃 The MQ-2 sensor detects LPG, propane, methane, hydrogen & smoke — a super nose!",
    "⚡ WiFi signals travel at the speed of light — sensor data reaches the server instantly!",
    "🥤 The first IoT device was a Coke machine at Carnegie Mellon in 1982!",
    "👁️ PIR sensors detect infrared from warm bodies — that's how EduGuard tracks presence without cameras!",
    "🤖 The word 'robot' comes from Czech 'robota' (forced labor). I prefer 'helpful assistant'! 😄",
    "🌍 There are more IoT devices on Earth than people — 75+ billion and counting!",
    "☕ A single ESP32 costs less than a coffee but runs a full monitoring system. Amazing!",
  ]);
}

async function handleMotivation() {
  return pick([
    "💪 You've got this! Every expert was once a beginner. Keep going! 🌟",
    "🚀 Stress is temporary, growth is permanent. Take a deep breath — you're stronger than you think!",
    "💎 Diamonds are made under pressure. Don't give up! ✨",
    "🎯 The hardest part is starting — you've already done that. Keep the momentum! 🔥",
  ]);
}

async function handleStudyTips() {
  return pick([
    "📚 Try the Pomodoro Technique: 25 min study + 5 min break. Active recall > re-reading! 🧠",
    "✨ Top tips: Teach what you learn, use spaced repetition, stay hydrated & get enough sleep! 💪",
    "🎯 Minimize distractions, use active recall, and review at intervals (1d, 3d, 7d). You've got this! 🚀",
  ]);
}

async function handleSing() {
  return pick([
    "🎵 Twinkle twinkle little sensor, how I wonder what you measure! 🎶",
    '🎤 "We will, we will... MONITOR YOU!" 😂 I\'ll stick to data analysis!',
    '🎶 "Every breath you take, the PIR sensor will be watching you!" Creepy or cool? 😄',
  ]);
}

async function handleFood() {
  return pick([
    "🍕 I run on electricity, not food! But go grab a snack — brain fuel is important! 🧠",
    "🍽️ Hungry? Go eat something yummy! I'll hold the fort. 😊",
    "☕ Snack break = productivity boost! Take care of yourself first, I'll be here.",
  ]);
}

async function handleTest() {
  return pick([
    "✅ I'm online and working perfectly! What do you need?",
    "🟢 Test successful! All systems go. How can I help?",
    "🚀 Loud and clear! Ready to assist!",
  ]);
}

async function handleConfused() {
  return pick([
    '🤔 No worries! Try "help" for all commands, or "summary" for today\'s overview!',
    '💡 Confused? Just ask naturally, or type "help" to see what I can do! 😊',
  ]);
}

async function handleWelcomeBack() {
  const todayEvents = await Event.countDocuments({ ts: todayRange() });

  return pick([
    `👋 Welcome back! ${todayEvents} event(s) recorded while you were away. Want a summary?`,
    `🌟 Hey, you're back! ${todayEvents} event(s) today — need a catch-up?`,
  ]);
}

/* ═══════════════════════════════════════════════════════
   Main Entry Point
   ═══════════════════════════════════════════════════════ */

/**
 * Process a user message and return the assistant's response.
 * @param {string} message - The user's message
 * @param {object} [ctx] - Extra context (e.g. clientHour)
 * @returns {Promise<string>} The assistant's reply
 */
export async function processMessage(message, ctx = {}) {
  const normalized = (message || "").toLowerCase().trim();

  if (!normalized) {
    return "✍️ Please type a message so I can help you!";
  }

  // Find matching intent
  for (const intent of INTENTS) {
    if (intent.keywords.some((kw) => normalized.includes(kw))) {
      return intent.handler(ctx);
    }
  }

  // Smart fallback
  const todayCount = await Event.countDocuments({ ts: todayRange() });

  const fallbacks = [
    `🤔 Hmm, I didn't quite get that! ${todayCount} event(s) today — try "summary", "status", or "help" to explore! 😊`,
    `💡 Not sure what you mean, but I'm here to help! Try "help" for all commands or "summary" for today's overview. ✨`,
    `😅 I'm scratching my virtual head! Try rephrasing, or type "help" to see what I can do. ${todayCount} event(s) logged today!`,
  ];

  return pick(fallbacks);
}

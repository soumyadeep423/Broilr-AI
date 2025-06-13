import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const normalizeNumberInput = (input) => {
  const map = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
  };

  const cleaned = input.toLowerCase().trim();

  if (map[cleaned]) return map[cleaned];
  if (!isNaN(Number(cleaned))) return Number(cleaned);
  return null;
};


const ChatBubble = ({ role, text }) => {
  const isUser = role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "10px"
    }}>
      <div style={{
        backgroundColor: isUser ? "#64b5f6" : "#2c2c2c",
        color: isUser ? "#121212" : "#fff",
        padding: "10px 14px",
        borderRadius: "18px",
        maxWidth: "70%",
        whiteSpace: "pre-wrap",
        fontSize: "14px",
        lineHeight: "1.4",
        textAlign: "left"
      }}>
        {text}
      </div>
    </div>
  );
};

function Chat() {
  const username = localStorage.getItem("username");
  const navigate = useNavigate();

  const [chat, setChat] = useState([{ role: "assistant", text: "👨‍🍳 Welcome to Broilr! Would you like to cook a new recipe or load a saved one?" }]);
  const [input, setInput] = useState("");

  const [flow, setFlow] = useState("choice"); // choice → new → load → followups → cooking
  const [dish, setDish] = useState("");
  const [followups, setFollowups] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [recipe, setRecipe] = useState(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);
  const [step, setStep] = useState(0);
  const scrollContainerRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const lastTranscriptRef = useRef("");
  // let recognition = null;

  const clearChat = () => {
    setChat([{ role: "assistant", text: "🍽️ What do you want to cook?" }]);
    setInput("");
    setRecipe(null);
    setStep(0);
    setFlow("dish");  // directly jump to dish input
  };
  const startListening = () => {
      const SpeechRecognition = window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript;
        transcript = transcript.toLowerCase().replace(/[^\w\s]/g, "").trim();

        if (transcript === lastTranscriptRef.current) return;
        lastTranscriptRef.current = transcript;

        console.log("🗣️ Heard:", transcript);
        setInput(transcript);
        send(transcript);
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
      };

      recognition.onend = () => {
        console.log("🎙️ Recognition ended");

        
        if (isListeningRef.current && flow === "cooking") {
          console.log("🔄 Restarting recognition...");
          setTimeout(() => startListening(), 1000); 
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
    };

    const stopListening = () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      isListeningRef.current = false;
      setIsListening(false);
    };

    useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
    }, [chat]);

    useEffect(() => {
      const lastMsg = chat[chat.length - 1];
      if (lastMsg?.role === "assistant") {
        startListening(); 
      }
    }, [chat]);

  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  const send = async (inputOverride) => {
  const rawInput = (typeof inputOverride === "string" ? inputOverride : input) || "";
  const msg = rawInput.trim();
  const normalizedMsg = msg.toLowerCase().replace(/[^\w\s]/g, "").trim();
  if (!msg) return;
  setInput("");
  setChat(prev => [...prev, { role: "user", text: msg }]);

  switch (flow) {
    case "choice": {
  const lowered = msg.toLowerCase();

  if (lowered.includes("load") || lowered.includes("saved")) {
    const res = await api.post("/load_recipes", { username });

    if (!res.data.recipes.length) {
      setChat(prev => [...prev, { role: "assistant", text: "📭 No saved recipes found." }]);
    } else {
      const recipeList = res.data.recipes.map((r, i) => `🍽️ ${i + 1}. ${r.recipe_name}`).join("\n");

      setChat(prev => [
        ...prev,
        {
          role: "assistant",
          text: `📚 Here are your saved recipes:\n\n${recipeList}\n\n👉 You can select the number or name to load a recipe.\n🗑️ Or delete a recipe.`
        }
      ]);

      setFollowups(res.data.recipes);
      setFlow("load_or_delete");  // NEW flow
    }
  }

  else if (lowered.includes("delete")) {
    const res = await api.post("/load_recipes", { username });

    if (!res.data.recipes.length) {
      setChat(prev => [...prev, { role: "assistant", text: "📭 No saved recipes found to delete." }]);
    } else {
      const recipeList = res.data.recipes.map((r, i) => `🍽️ ${i + 1}. ${r.recipe_name}`).join("\n");

      setChat(prev => [
        ...prev,
        {
          role: "assistant",
          text: `🗑️ Which recipe would you like to delete?\n\n${recipeList}\n\n👉 Please say the number or name of the recipe to delete:`
        }
      ]);

      setFollowups(res.data.recipes);
      setFlow("delete");
    }
    return;
  }

  else if (lowered.includes("new") || lowered.includes("cook")) {
    setChat(prev => [...prev, { role: "assistant", text: "🍽️ What do you want to cook?" }]);
    setFlow("dish");
  }

  else {
    setChat(prev => [...prev, {
      role: "assistant",
      text: "👋 Load saved recipes or cook something new!"
    }]);
  }
  break;
}

    case "load_or_delete": {
  const lowered = msg.toLowerCase();

  // Check if user wants to delete instead
  if (lowered.includes("delete")) {
    const recipeList = followups
      .map((r, i) => `🍽️ ${i + 1}. ${r.recipe_name}`)
      .join("\n");

    setChat(prev => [
      ...prev,
      {
        role: "assistant",
        text: `🗑️ Which recipe would you like to delete?\n\n${recipeList}\n\n👉 Please select the number or name of the recipe to delete:`
      }
    ]);
    setFlow("delete");
    break;
  }

  // Try matching recipe by number or name
  let index = normalizeNumberInput(msg);
  let selected = null;

  if (index !== null && index >= 1 && index <= followups.length) {
    selected = followups[index - 1];
  } else {
    selected = followups.find(r =>
      r.recipe_name.toLowerCase().includes(lowered)
    );
  }

  if (!selected) {
    setChat(prev => [...prev, {
      role: "assistant",
      text: "❌ Couldn't find that recipe. Please try again with a number or name. Or say 'delete' to remove one."
    }]);
    return;
  }

  setRecipe(selected);
  setChat(prev => [
    ...prev,
    { role: "assistant", text: `✅ Loaded recipe: ${selected.recipe_name}` },
    { role: "assistant", text: "🍳 Ready to start cooking? (yes/no)" }
  ]);
  setFlow("start_cooking");
  break;
}


    case "load": {
      let index = normalizeNumberInput(msg);
      let selected = null;

      if (index !== null && index >= 1 && index <= followups.length) {
        selected = followups[index - 1];
      } else {
        selected = followups.find(r => r.recipe_name.toLowerCase().includes(msg.toLowerCase()));
      }

      if (!selected) {
        setChat(prev => [...prev, {
          role: "assistant",
          text: "❌ Couldn't find that recipe. Please try again with a number or name."
        }]);
        return;
      }

      setRecipe(selected);
      setChat(prev => [
        ...prev,
        { role: "assistant", text: `✅ Loaded recipe: ${selected.recipe_name}` },
        { role: "assistant", text: "🍳 Ready to start cooking? (yes/no)" }
      ]);
      setFlow("start_cooking");
      break;
    }

    case "dish": {
      setDish(msg);
      const res = await api.post("/followups", { dish: msg });
      if (!res.data.questions?.length) {
        setChat(prev => [...prev, { role: "assistant", text: "❌ Gemini failed to generate follow-up questions." }]);
      } else {
        setFollowups(res.data.questions);
        setChat(prev => [...prev, { role: "assistant", text: res.data.questions[0] }]);
        setFlow("followups");
      }
      break;
    }

    case "followups": {
      const currentQ = followups[currentQIndex];
      const newAnswers = { ...answers, [currentQ]: msg };
      setAnswers(newAnswers);

      if (currentQIndex + 1 < followups.length) {
        setCurrentQIndex(currentQIndex + 1);
        setChat(prev => [...prev, { role: "assistant", text: followups[currentQIndex + 1] }]);
      } else {
        const res = await api.post("/generate_recipe", {
          dish,
          answers: newAnswers,
          username,
        });
        setRecipe(res.data.recipe);
        setIsNewRecipe(true);
        setChat(prev => [
          ...prev,
          { role: "assistant", text: "✅ Recipe Generated!" },
          { role: "assistant", text: `🥣 Your recipe has ${res.data.recipe.ingredients.length} ingredients and ${res.data.recipe.steps.length} steps.` },
          { role: "assistant", text: "🍳 Ready to start cooking? (yes/no)" },
        ]);
        setFlow("start_cooking");
      }
      break;
    }

    case "start_cooking": {
      const normalized = msg.toLowerCase().replace(/[^\w\s]/g, "").trim();

      const yesPhrases = [
        "yes", "yeah", "yep", "sure", "of course", "okay", "ok", "alright",
        "lets go", "let us begin", "im ready", "ready", "go ahead", "start", "lets start", "lets begin", "lets do this"
      ];
      const noPhrases = [
        "no", "not now", "later", "maybe later", "not yet", "stop", "cancel"
      ];

      const isYes = yesPhrases.some(p => normalized.includes(p));
      const isNo = noPhrases.some(p => normalized.includes(p));

      if (isYes) {
        setStep(0);
        setChat(prev => [...prev, {
          role: "assistant",
          text: `👣 Step 1: ${recipe.steps[0].instruction}`
        }]);
        setFlow("cooking");
      } else if (isNo) {
        setChat(prev => [...prev, {
          role: "assistant",
          text: "👋 Come back when you're ready to cook!"
        }]);
        setFlow("done");
      } else {
        setChat(prev => [...prev, {
          role: "assistant",
          text: "❓ Please let me know if you're ready to start cooking (yes/no)."
        }]);
      }

      break;
    }


    case "cooking": {
      const normalizedMsg = msg.toLowerCase().replace(/[^\w\s]/g, "").trim();
      const nextPhrases = ["next", "go on", "continue", "move ahead", "okay", "done", "lets go", "proceed", "go ahead"];
      const isNextCommand = nextPhrases.some(phrase => normalizedMsg.includes(phrase));

      const repeatPhrases = ["repeat", "say again", "once more", "can you repeat", "again", "please repeat"];
      const isRepeatCommand = repeatPhrases.some(phrase => normalizedMsg.includes(phrase));

      const currentStepIndex = step;

      if (isRepeatCommand) {
        setChat(prev => [
          ...prev,
          { role: "assistant", text: `🔁 ${recipe.steps[currentStepIndex].instruction}` },
        ]);
        return;
      }

      if (isNextCommand) {
        const nextStep = currentStepIndex + 1;

        if (nextStep < recipe.steps.length) {
          setStep(nextStep);
          setChat(prev => [
            ...prev,
            {
              role: "assistant",
              text: `👣 Step ${recipe.steps[nextStep].step_number}: ${recipe.steps[nextStep].instruction}`
            }
          ]);
        } else {
          const endChat = [
            { role: "assistant", text: "🎉 You've completed the recipe! Bon appétit!" },
            { role: "assistant", text: "🧑‍🍳 Thank you for cooking with Broilr!" },
            { role: "assistant", text: "Refresh the page for a new recipe" }
          ];

          if (isNewRecipe) {
            endChat.push({ role: "assistant", text: "💾 Would you like to save this recipe to your profile? (yes/no)" });
            setFlow("ask_save");
          } else {
            setFlow("done");
          }

          setChat(prev => [...prev, ...endChat]);
        }
        console.log("step index", step)
        return;
      }

      // If it's not a "next" or "repeat" command, treat it as a question
      const currentStep = recipe.steps[currentStepIndex];
      const res = await api.post("/ask_step", {
        question: msg,
        step: currentStep,
        history: [],
      });
      setChat(prev => [...prev, { role: "assistant", text: res.data.answer }]);
      break;
    }


    case "ask_save": {
      const yesPhrases = ["yes", "start", "go ahead", "okay", "let's begin", "ready"];
      const isYes = yesPhrases.some(p => normalizedMsg.includes(p));

      if (isYes) {
        await api.post("/save_recipe", {
          recipe,
          username,
        });
        setChat(prev => [
          ...prev,
          { role: "assistant", text: "✅ Recipe saved to your profile!" },
          { role: "assistant", text: "🧑‍🍳 Thank you for cooking with Broilr!" },
          { role: "assistant", text: "Refresh the page for a new recipe" }
        ]);
      } else {
        setChat(prev => [
          ...prev,
          { role: "assistant", text: "🧑‍🍳 No worries! Thank you for cooking with Broilr!" },
          { role: "assistant", text: "Refresh the page for a new recipe" }
        ]);
      }
      setFlow("done");
      break;
    }
    case "delete": {
        const index = normalizeNumberInput(msg) - 1;
        let selected = null;

        if (index >= 0 && index < followups.length) {
          selected = followups[index];
        } else {
          selected = followups.find(r => r.recipe_name.toLowerCase().includes(msg.toLowerCase()));
        }

        if (!selected) {
          setChat(prev => [...prev, { role: "assistant", text: "❌ Could not find that recipe. Please try again." }]);
        } else {
          await api.post("/delete_recipe", {
            username,
            recipe_name: selected.recipe_name
          });

          setChat(prev => [
            ...prev,
            { role: "assistant", text: `✅ Deleted recipe: ${selected.recipe_name}` },
            { role: "assistant", text: "🧹 Your recipe list is now updated." },
            { role: "assistant", text: "👋 Would you like to load another saved recipe or cook a new one?" }
          ]);
          setFlow("choice");
        }
      break;
    }

    default:
      break;
  }
};


  const buttonStyle = {
    backgroundColor: "#333",
    color: "#fff",
    padding: "8px 16px",
    border: "1px solid #555",
    borderRadius: "5px",
    cursor: "pointer"
  };


  return (
<div style={{ padding: "10px", maxHeight: "100vh", backgroundColor: "#121212", color: "#e0e0e0", boxSizing: "border-box", borderRadius: "12px" }}>
    <div style={{
      maxWidth: "100%",
      width: "100%",
      margin: "0 auto",
      backgroundColor: "#1e1e1e",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 0 10px rgba(255,255,255,0.05)",
      boxSizing: "border-box"
    }}>
      <h2 style={{ textAlign: "center" }}>👩‍🍳 Broilr AI</h2>

      <div
        ref={scrollContainerRef}
        style={{
            width: "100%",
            // height: "50vh",
            overflowY: "auto",
            backgroundColor: "#181818",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #333",
            display: "flex",
            flexDirection: "column",
            maxHeight: "60vh",
            boxSizing: "border-box"
        }}
        >
        {chat.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} text={msg.text} />
        ))}
    </div>


      <div style={{ display: "flex", marginTop: "10px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type here..."
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor: "#2c2c2c",
            border: "1px solid #444",
            borderRadius: "6px",
            color: "#fff"
          }}
        />
        <button onClick={() => send()} style={{
          marginRight: "5px",
          marginLeft: "5px",
          padding: "12px 16px",
          backgroundColor: "#64b5f6",
          color: "#121212",
          border: "none",
          borderRadius: "6px",
          fontWeight: "bold"
        }}>
          Send
        </button>
        <button onClick={isListening ? stopListening : startListening} style={buttonStyle}>
          {isListening ? "🛑" : "🎤"}
        </button>


      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
        <button onClick={clearChat} style={buttonStyle}>🗑️ Clear Chat</button>
        <button onClick={handleLogout} style={buttonStyle}>🚪 Logout</button>
    </div>
    

  </div>
);

}
const handleLogout = () => {
  localStorage.removeItem("username");
  window.location.href = "/";
};

export default Chat;

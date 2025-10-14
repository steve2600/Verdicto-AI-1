  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [verdictAnalysis, setVerdictAnalysis] = useState<any>(null);
  const [generatedNotes, setGeneratedNotes] = useState<any>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
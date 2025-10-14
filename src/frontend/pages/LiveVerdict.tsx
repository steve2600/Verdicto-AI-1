            {analysisMode === "judge" ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Type your court proceedings here or use voice transcription..."
                  className="min-h-[400px] max-h-[600px] resize-none font-light"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  value={transcript + (liveWords.length > 0 ? " " + liveWords.join(" ") : "")}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                {liveWords.length > 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    Live transcription in progress...
                  </div>
                )}
              </div>
            ) : (
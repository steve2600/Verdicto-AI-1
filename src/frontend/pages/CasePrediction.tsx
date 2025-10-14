import React, { useState } from 'react';
import { User, Briefcase, } from 'lucide-react';

const App = () => {
  const [userMode, setUserMode] = useState<"citizen" | "lawyer">("citizen");

  return (
    <div>
      <h1>App</h1>
    </div>
  );
};

export default App;
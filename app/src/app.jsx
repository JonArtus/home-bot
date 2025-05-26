import { useState, useEffect } from 'preact/hooks';

export function App() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => {
        console.error("Error fetching data:", err);
        setMessage("Error fetching data from API.");
      });
  }, []);

  return (
    <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      <h1 class="text-4xl font-bold mb-8">Home Bot</h1>
      <p class="text-xl">Message from API: <span class="font-semibold text-cyan-400">{message}</span></p>
    </div>
  );
} 
import React, { useState } from 'react';
import './App.css';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const validateInput = (value: string): boolean => {
    return value.trim().length > 0;
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    if (error) setError(null); // Clear error on valid input
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateInput(inputValue)) {
      setError('Input cannot be empty. Please provide a valid input.');
      return;
    }

    setSubmitted(true);
    // Simulate API call or further logic here
  };

  return (
    <div className="App">
      <h1>My Application</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter something"
        />
        <button type="submit">Submit</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {submitted && <p style={{ color: 'green' }}>Form submitted successfully!</p>}
      </form>
    </div>
  );
};

export default App;
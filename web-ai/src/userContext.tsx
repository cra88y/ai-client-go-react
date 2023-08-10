
import { createContext, FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useCookies } from 'react-cookie';
import { Message } from './types/Message';

interface iUserContext {
  apiKey: string;
  setApiKey: (apiKey: string) => void
  threads: { [index: number]: Message[] };
  setThreads: (threads: { [index: number]: Message[] }) => void;
  currThread: number;
  setCurrThread: (currThread: number) => void;
}

export const UserContext = createContext({} as iUserContext);

export const UserProvider: FunctionComponent = ({ children }) => {
  const [apiKey, setApiKey] = useState('');
  const [threads, setThreads] = useState<{ [index: number]: Message[] }>({});
  const [currThread, setCurrThread] = useState(0);
  const [cookies, setCookies] = useCookies(['threads']);

  useEffect(() => {
    setCookies();
  }, [threads[currThread]]);

  useEffect(() => {
    setThreads(
        cookies.threads ? cookies.threads : {}
    );
  }, []);
  return (
    <UserContext.Provider
      value={{
          apiKey,
          setApiKey,
          threads,
          setThreads,
          currThread,
          setCurrThread
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
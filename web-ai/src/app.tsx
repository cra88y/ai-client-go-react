import { useState, useContext, useEffect } from 'preact/hooks'
import { FunctionComponent, createContext } from 'preact';
import './app.css'
import axios from 'axios';
import { ChangeEvent } from 'preact/compat';
import { useCookies } from 'react-cookie';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';

interface UserContext {
  apiKey: string;
  setApiKey: Function;
}
interface LayerOptions {
	specifyPrompt        :boolean;
	generateSearchTerm   :boolean;
	search               :boolean;
	searchResultsCount   :number;
	processSearchResults :boolean;
	maxResponseTokens    :number;
}

export const UserContext = createContext({} as UserContext);
export const UserProvider: FunctionComponent = ({children}) => {
  const [apiKey, setApiKey] = useState("")
  return (<UserContext.Provider value = {{apiKey, setApiKey}}>
    {children}
  </UserContext.Provider>)
}

export function App() {
  return (
    <div className="app-container">
      <UserProvider>
        <Header/>
        <Home/>
        <Footer/>
      </UserProvider>
    </div>
  )
}

function Header(){
  return (
    <div className="header-container">
      <div>orpheus</div>
      <div className="header-right">
         <div>Login</div>
         <div>Sign-Up</div> 
      </div>
    </div>
  )
}
interface Message {
  Role: string;
  Content: string;
}

interface ResponseObject {
  choices: {
    [index: number]: {
      finish_reason: string;
      index: number;
      message: {
        role: string;
        content: string;
      };
    };
  };
  created: number;
  id: string;
  model: string;
  object: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

function useAi() {
  const { apiKey } = useContext(UserContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const aiQuery = (inputText: string, options: LayerOptions) => {
    const message: Message = {
      Role: "user",
      Content: inputText
    }
    const allMessages = [...messages, message];
    setMessages(allMessages)
    console.log(options)
    axios.post("http://127.0.0.1:3000/ai", {
      apiKey,
      messages: allMessages,
      layerOptions: options
    },
    {headers: {
      "Content-Type": "application/json"
    }})
    .then ((response) => {
      const data: ResponseObject = response.data;
      const message = data.choices[0].message;
      setMessages([...allMessages, {Role: message.role, Content: message.content}]);
    })
    .catch(err => console.log(err))
  };
  return {
    messages,
    aiQuery
  }
}

function QueryBox({setThreadMessages}: {setThreadMessages: Function}) {
  const {
    messages,
    aiQuery
  } = useAi();
  const [inputText, setInputText] = useState('');
  const [options, setOptions] = useState({
    specifyPrompt: true,
    search: true,
    generateSearchTerm: true,
    searchResultsCount: 6,
    processSearchResults: false,
    maxResponseTokens: 500,
  } as LayerOptions) 
  useEffect(()=> setThreadMessages(messages), [messages])
  const aiQueryHelper = ()=> {
    aiQuery(inputText, options);
    setInputText("");
  }
  const handleKeyDown = (e: KeyboardEvent) => {
    if(e.key == "Enter"){
      setTimeout(()=> aiQueryHelper(), 0);
    }
    else if(e.target instanceof HTMLInputElement){
      setInputText(e.target.value);
    }
  }
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
  if (e.target == null) return
  const { name, value, type, checked } = e.target as HTMLInputElement;
  const newValue = type === 'checkbox' ? checked : value;

  setOptions((prevOptions) => ({
    ...prevOptions,
    [name]: newValue,
  }));
  };
  return (
    <>
      <div className="message-box">
        <input
          className="prompt-input"
          onKeyUp={handleKeyDown}
          type="text"
          placeholder="Ask Anything..."
          value={inputText}
        />
        <button onClick={aiQueryHelper} className="button-clean">{">"}</button>
      </div>
      <div className="message-options">
        <label>
          Specify Prompt:
          <input
            type="checkbox"
            name="specifyPrompt"
            checked={options.specifyPrompt}
            onChange={handleInputChange}
          />
        </label>
        <br/>
        <label>
          Search:
          <input
            type="checkbox"
            name="search"
            checked={options.search}
            onChange={handleInputChange}
          />
        </label>
        <br/>
        <label>
          Generate Search Query:
          <input
            type="checkbox"
            name="generateSearchTerm"
            checked={options.generateSearchTerm}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Process Search Results:
          <input
            type="checkbox"
            name="processSearchResults"
            checked={options.processSearchResults}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Search Results Count:
          <input
            type="number"
            name="searchResultsCount"
            value={options.searchResultsCount}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Max Response Tokens:
          <input
            type="number"
            name="maxResponseTokens"
            value={options.maxResponseTokens}
            onChange={handleInputChange}
          />
        </label>
      </div>
    </>
  )
}
interface ThreadProps {
  messages: Message[]
}
function Thread ({messages}: ThreadProps) {
  return (<div className="thread-messages"> {
    messages && messages.map(msg=>{
      const role = msg.Role;
      const content = msg.Content;
      return (
        <div className="thread-message-container">
          <ReactMarkdown className="thread-message">{role + ": " +content}</ReactMarkdown>
        </div>)
    })}
  </div>)
}

function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  return (<div className="chat-container">
  <Thread messages={messages}/>
  <QueryBox setThreadMessages={setMessages}/>
  </div>)
}

function Footer(){
  return (<div>
    <Dev/> 
  </div>)
}

function Dev(){
  const {apiKey, setApiKey} = useContext(UserContext)
  const [cookies, setCookie] = useCookies(['apiKey']);
  const onApiKeyChange = (e: ChangeEvent<HTMLInputElement>) =>{
    if(e.target instanceof HTMLInputElement)
      setApiKey(e.target.value)
  }
  useEffect(() => {
    if (cookies.apiKey) {
      setApiKey(cookies.apiKey);
    }
  }, [cookies.apiKey, setApiKey]);
  useEffect(() => {
    setCookie('apiKey', apiKey, { path: '/' });
  }, [apiKey, setCookie]);
  return (<div>
  <span>API_KEY: <input onChange={onApiKeyChange} value={apiKey} type="text"/></span>
    </div>)
}
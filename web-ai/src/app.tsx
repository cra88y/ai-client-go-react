import { useState, useContext, useEffect } from 'preact/hooks'
import { FunctionComponent, createContext } from 'preact';
import './app.css'
import axios from 'axios';
import { ChangeEvent } from 'preact/compat';
import { useCookies } from 'react-cookie';

interface UserContext {
  apiKey: string;
  setApiKey: Function;
}
const emptyUserContext = {} as UserContext;
export const UserContext = createContext(emptyUserContext);
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
  role: string;
  content: string;
}

interface ResponseObject {
  prompt: string;
  choices: {
    [index: number]: {
      finish_reason: string;
      index: number;
      message: Message;
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

function Home() {
  const { apiKey } = useContext<any>(UserContext);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ResponseObject[]>([]); 
  
  const handleClick = () => {
    const prompt = inputText;
    setInputText('');
    axios.post("http://127.0.0.1:3000/ai", {
      apiKey,
      input: prompt
    },
    {headers: {
      "Content-Type": "application/json"
    }})
    .then ((response) => {
      const data: ResponseObject = {
        prompt,
        ...response.data
      };
      setMessages(prev =>[data, ...prev]);
    })
    .catch(err => console.log(err))
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    if(e.key == "Enter"){
      setTimeout(()=> handleClick(), 0);
    }
    else if(e.target instanceof HTMLInputElement){
      setInputText(e.target.value);
    }
  }
  return (
    <div className="chat-container">
      <Thread messages={messages}/>
      <div className="center-div">
      <input
        className="prompt-input"
        onKeyUp={handleKeyDown}
        type="text"
        placeholder="Ask Anything..."
        value={inputText}
      />
      <button onClick={handleClick} className="button-clean">{">"}</button>
      </div>
    </div>
  )
}
interface Props {
  messages: ResponseObject[]
}
function Thread ({messages}: Props) {
  return (<div className="thread-messages"> {
    messages && messages.map(msg=>{
      const content = msg.choices[0].message.content;
      const prompt = msg.prompt;
      // const author = msg.choices[0].message.role;
      return (
        <div className="thread-message-container">
          <div className="thread-message">You: {prompt}</div>
          <div className="thread-message">orpheus: {content}</div>
        </div>)
    })}
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
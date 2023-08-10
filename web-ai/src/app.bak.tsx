import { useState, useContext, useEffect } from 'preact/hooks'
import { FunctionComponent, createContext } from 'preact';
import './app.css'
import Router, {Route, route} from 'preact-router';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import Markdown from 'preact-markdown';
import { ChangeEvent } from 'preact/compat';
interface LayerOptions {
	prompt        :boolean;
	generateSearchTerm   :boolean;
	search               :boolean;
	searchResultsCount   :number;
	processSearchResults :boolean;
	maxResponseTokens    :number;
}

interface UserContext {
  apiKey: string;
  setApiKey: Function;
  threads: {[index: number]: Message[]};
  setThreads: Function;
  currThread: number;
  setCurrThread: Function;
}
export const UserContext = createContext({} as UserContext);
export const UserProvider: FunctionComponent = ({children}) => {
  const [apiKey, setApiKey] = useState("")
  const [threads, setThreads] = useState<UserContext["threads"]>({} as UserContext["threads"])
  const [currThread, setCurrThread] = useState(0);
  const [cookies, setCookies] = useCookies(['threads'])
  useEffect(() => {
    setCookies('threads', threads, { path: '/' });
  }, [threads[currThread]]);
  useEffect(()=>{
   setThreads(cookies.threads)
  }, [])
  return (<UserContext.Provider value = {{
    apiKey,
    setApiKey,
    threads,
    setThreads,
    currThread,
    setCurrThread,
  }}>
    {children}
  </UserContext.Provider>)
}

export function App() {
  return (
    <div className="app-container">
      <UserProvider>
        <div className="client-container">
        <ThreadsPanel />
          <Router>
            <Route path="/" component={Home}/>
            <Route path="/threads/:id" component={Home} />
          </Router>
        </div>
        <Footer/>
      </UserProvider>
    </div>
  )
}

export function ThreadsPanel(){
  const {threads} = useContext(UserContext)
  return (<div className="panel-container">
    <div className="panel-header">Threads</div>
    <a href="/">+ New Thread</a>
    {Object.keys(threads).map(threadKey =>{
      const thread = threads[Number(threadKey)]
      return (
        <div className="thread-title" key={threadKey}>
          <a href={`/threads/${threadKey}`}>{thread[0].Content.slice(0, 50)}</a>
        </div>
      )
    })}
    </div>)
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
  const { apiKey, threads, currThread, setThreads } = useContext(UserContext);
  const aiQuery = async (options: LayerOptions) => {
    try {
      const response = await axios.post("http://127.0.0.1:3000/ai", {
        apiKey,
        messages: threads[currThread],
        layerOptions: options
      },
      {headers: {
        "Content-Type": "application/json"
      }})
      const data: ResponseObject = response.data;
      const message = data.choices[0].message;
      setThreads({...threads, [currThread]: [...threads[currThread], {Role: message.role, Content: message.content}]})
    }
    catch(err) {
      console.log(err)
    }
    
  };
  return {
    aiQuery
  }
}

function QueryBox() {
  const {
    aiQuery
  } = useAi();
  const [inputText, setInputText] = useState('');
  const [options, setOptions] = useState({
    prompt: true,
    search: true,
    generateSearchTerm: true,
    searchResultsCount: 6,
    processSearchResults: false,
    maxResponseTokens: 500,
  } as LayerOptions) 
  const { threads, currThread, setThreads } = useContext(UserContext);
  useEffect(()=> {
    if (!threads[currThread]) return
    if(threads[currThread][threads[currThread].length - 1].Role != "user") return
    aiQuery(options)}
  , [threads[currThread]])
  
  const submitMsg = ()=>{
    let id = currThread
    if(currThread == undefined){
      const numThreads = Object.keys(threads).length
      id = threads ? numThreads : 0
      route("/threads/" + id)
    }
    const message = {
      Role: "user",
      Content: inputText,
    }
    var thread: Message[]
    if(threads[currThread])
      thread = [...threads[id], message]
    else
      thread = [message]
    setThreads({...threads, [id]: thread})
    setInputText("")
  }
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if(e.key == "Enter"){
      setTimeout(()=> submitMsg(), 0);
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
        <div className="prompt-input">
        <input
          onKeyUp={handleKeyDown}
          type="text"
          placeholder="Ask Anything..."
          value={inputText}
        />
        <button onClick={submitMsg} className="button-clean">{">"}</button>
        </div>
      </div>
      <div className="message-options">
        <label>
          Specify Prompt:
          <input
            type="checkbox"
            name="prompt"
            checked={options.prompt}
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
          <div className="thread-message-author">{role} </div>
          <div className="thread-message">
          <Markdown markdown={content}/>
          </div>
        </div>)
    })}
  </div>)
}

function Home({id}: {id: number}) {
  const {setCurrThread, currThread, threads} = useContext(UserContext);
  useEffect(()=>{
    setCurrThread(id)
  }, [id])
  return (<div className="chat-container">
  <Thread messages={threads[currThread]}/>
  <QueryBox />
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
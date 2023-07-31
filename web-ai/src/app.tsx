import { useState, useContext, useEffect } from 'preact/hooks'
import { PreactContext, createContext } from 'preact';
import axios from 'axios';
import './app.css'

export const UserContext = createContext();
export const UserProvider = ({children}) => {
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

function Home() {
  const { apiKey } = useContext<any>(UserContext);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]); 
  
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };
  const handleClick = (e) => {
    axios.post("http://127.0.0.1:3000/ai", {
      apiKey,
      input: inputText
    },
    {headers: {
        "Content-Type": "application/json"
      }})
    .then (response => {
      setMessages(prev=>[response.data, ...prev]);
    })
    .catch(err => console.log(err))
  };

  return (
    <div>
      <span>
      <input
        type="text"
        placeholder="Ask Anything..."
        value={inputText}
        onChange={handleInputChange}
      />
      <button onClick={handleClick} className="button-clean">{">>>"}</button>
      </span>
      <div>
      {
        messages && messages.map(msg=>{
          console.log(msg)
          return JSON.stringify(msg.data.choices[0])
        })  
      }
      </div>
    </div>
  )
}


function Footer(){
  return (<div>
    <Dev/> 
  </div>)
}

function Dev(){
  const {apiKey, setApiKey} = useContext(UserContext)
  return (<div>
  <span>API_KEY: <input onChange={e=>setApiKey(e.target.value)} value={apiKey} type="text"/></span>
    </div>)
}
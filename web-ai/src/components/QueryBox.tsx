import {useContext, useEffect, useState} from 'preact/hooks';
import {FunctionComponent} from 'preact';
import {AiOptions, useAi} from '../hooks/useAi';
import {UserContext} from '../userContext';
import {ChangeEvent} from 'preact/compat';
import {route} from 'preact-router';
import {Message} from '../types/Message';

export const QueryBox: FunctionComponent = () => {
  const {aiQuery} = useAi();
  const [inputText, setInputText] = useState('');
  const [options, setOptions] = useState({
    specifyPrompt: true,
    search: true,
    generateSearchTerm: true,
    searchResultsCount: 6,
    processSearchResults: false,
    maxResponseTokens: 500,
  } as AiOptions);


   const {threads, currThread, setThreads} = useContext(UserContext);

  useEffect(() => {
    if (!threads[currThread]) return;
    if (threads[currThread][threads[currThread].length - 1].Role !== 'user') return;
    aiQuery(options)
  }, [threads[currThread]]);

  const submitMsg = () => {
    let id = currThread;
    if (currThread == undefined) {
      const numThreads = Object.keys(threads).length;
      id = threads ? numThreads : 0;
      route(`/threads/${id}`);
    }
    const message = {
      Role: 'user',
      Content: inputText,
    };
    const thread: Message[] = threads[currThread]
        ? [...threads[id], message]
        : [message];
    setThreads({...threads, [id]: thread});
    setInputText('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      setTimeout(() => submitMsg(), 0);
    } else if (e.target instanceof HTMLInputElement) {
      setInputText(e.target.value);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target !instanceof HTMLInputElement) return;
    const {name, value, type, checked} = e.target;
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
                onKeyUp={()=>handleKeyDown}
                type="text"
                placeholder="Ask Anything..."
                value={inputText}
            />
            <button onClick={submitMsg} className="button-clean">
              {">"}
            </button>
          </div>
        </div>
        <div className="message-options">
          <label>
            Specify Prompt:
            <input
                type="checkbox"
                name="prompt"
                checked={options.specifyPrompt}
                onChange={()=>handleInputChange}
            />
          </label>
          <br/>
          <label>
            Search:
            <input
                type="checkbox"
                name="search"
                checked={options.search}
                onChange={()=>handleInputChange}
            />
          </label>
          <br/>
          <label>
            Generate Search Query:
            <input
                type="checkbox"
                name="generateSearchTerm"
                checked={options.generateSearchTerm}
                onChange={()=>handleInputChange}
            />
          </label>
          <br/>
          <label>
            Process Search Results:
            <input
                type="checkbox"
                name="processSearchResults"
                checked={options.processSearchResults}
                onChange={()=>handleInputChange}
            />
          </label>
          <br/>
          <label>
            Search Results Count:
            <input
                type="number"
                name="searchResultsCount"
                value={options.searchResultsCount}
                onChange={()=>handleInputChange}
            />
          </label>
          <br/>
          <label>
            Max Response Tokens:
            <input
                type="number"
                name="maxResponseTokens"
                value={options.maxResponseTokens}
                onChange={()=>handleInputChange}
            />
          </label>
        </div>
      </>
  );
};
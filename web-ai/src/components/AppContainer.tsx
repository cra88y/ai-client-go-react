import {FunctionalComponent} from 'preact';
import { ThreadsPanel } from './ThreadsPanel';
import { Home } from './Home';
import { Footer } from './Footer';
import { Router, Route } from 'preact-router';

export const AppContainer: FunctionalComponent = () => {
  return (
    <>
    <div className="client-container">
      <ThreadsPanel />
      <Router>
         <Route path="/" component={Home} />
         <Route path="/threads/:id" component={Home} />
      </Router>
      </div>
      <Footer />
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { brandConfig } from './config';
import { AppMode, CombinedPersona } from './types';
import { Navigation } from './components/Navigation';
import { PDPHub } from './components/PDPHub';
import { PDPEnrichment } from './components/PDPEnrichment';
import { MultiImage } from './components/MultiImage';
import { PDPPersonalization } from './components/PDPPersonalization';
import { ESpots } from './components/ESpots';
import { GenSiteStub } from './components/GenSiteStub';
import { AudienceGenerator } from './components/AudienceGenerator';
import { MarketingCampaign } from './components/MarketingCampaign';
import { ContentVersioning } from './components/ContentVersioning';
import { MarketingBrief } from './components/MarketingBrief';
import { SyntheticChat } from './components/SyntheticChat';
import { SyntheticTesting } from './components/SyntheticTesting';
import { Home } from './components/Home';
import { ProjectHelper } from './components/ProjectHelper';
import { FeasibilityAnalysis } from './components/FeasibilityAnalysis';

import { Assistant } from './components/Assistant';
import { Concierge } from './components/Concierge';
import { SyntheticUsers } from './components/SyntheticUsers';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [personas, setPersonas] = useState<CombinedPersona[]>([]);
  const [context, setContext] = useState<string>('');

  useEffect(() => {
    document.title = brandConfig.meta.title;

    // Load audiences from the file system explicitly if they exist
    const loadAudiences = async () => {
      try {
        const res = await fetch('/api/load-run/audience_generator');
        if (res.ok) {
          const data = await res.json();
          if (data.personas && Array.isArray(data.personas)) {
            setPersonas(data.personas);
          }
          if (data.context) {
            setContext(data.context);
          }
        }
      } catch (err) {
        console.warn("No saved audience run found, starting empty.", err);
      }
    };
    loadAudiences();
  }, []);

  const renderContent = () => {
    switch (mode) {
      case AppMode.PDP_HUB:
        return <PDPHub />;
      case AppMode.PDP_PERSONALIZATION:
        return <PDPPersonalization />;
      case AppMode.PDP_ENRICHMENT:
        return <PDPEnrichment />;
      case AppMode.MULTI_IMAGE:
        return <MultiImage />;
      case AppMode.E_SPOTS:
        return <ESpots />;
      case AppMode.CONTENT_VERSIONING:
        return <ContentVersioning />;
      case AppMode.GEN_SITE:
        return <GenSiteStub />;
      case AppMode.AUDIENCE_GEN:
        return (
          <AudienceGenerator 
            personas={personas} 
            setPersonas={setPersonas} 
            context={context} 
            setContext={setContext} 
          />
        );
      case AppMode.MARKETING_CAMPAIGN:
        return <MarketingCampaign />;
      case AppMode.MARKETING_BRIEF:
        return <MarketingBrief />;
      case AppMode.SYNTHETIC_CHAT:
        return <SyntheticChat />;
      case AppMode.SYNTHETIC_USERS:
        return <SyntheticUsers personas={personas} />;
      case AppMode.SYNTHETIC_FOCUS_GROUP:
        return <SyntheticTesting />;
      case AppMode.FEASIBILITY_ANALYSIS:
        return <FeasibilityAnalysis />;
      case AppMode.PROJECT_HELPER:
        return <ProjectHelper />;
      case AppMode.ASSISTANT:
        return <Assistant />;
      case AppMode.CONCIERGE:
        return <Concierge />;
      case AppMode.HOME:
      default:
        return (
          <Home setMode={setMode} />
        );
    }
  };

  return (
    <div className="app-container font-sans">
      <Navigation
        currentMode={mode}
        setMode={setMode}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className={`
        main-content p-4 md:p-8 transition-all duration-300
        mt-16 md:mt-0
      `}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;

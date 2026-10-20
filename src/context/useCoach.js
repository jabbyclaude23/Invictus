import { createContext, useContext } from 'react';

export const CoachContext = createContext(null);
export const useCoach = () => useContext(CoachContext);

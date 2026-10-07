import { SUPPORTED_FONTS } from '../config/fonts.config';

// Fonts offered in the font pickers: only the ones the report server supports.
export const getAvailableFonts = async (): Promise<string[]> => [...SUPPORTED_FONTS];

import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // Use Spanish as default if locale is not provided
  const currentLocale = locale || 'es';
  
  return {
    locale: currentLocale,
    messages: (await import(`./locales/${currentLocale}.json`)).default
  };
});


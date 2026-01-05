import { createTheme } from '@aws-amplify/ui-react';

/**
 * Custom Amplify UI theme matching the site's dark design.
 * Maps to CSS variables defined in index.css.
 */
export const authTheme = createTheme({
  name: 'minfeed-dark',
  tokens: {
    colors: {
      background: {
        primary: { value: 'hsl(220 20% 6%)' },
        secondary: { value: 'hsl(220 15% 18%)' },
      },
      font: {
        primary: { value: 'hsl(210 20% 95%)' },
        secondary: { value: 'hsl(215 15% 55%)' },
        interactive: { value: 'hsl(195 100% 50%)' },
      },
      brand: {
        primary: {
          10: { value: 'hsl(195 100% 95%)' },
          20: { value: 'hsl(195 100% 85%)' },
          40: { value: 'hsl(195 100% 70%)' },
          60: { value: 'hsl(195 100% 55%)' },
          80: { value: 'hsl(195 100% 50%)' },
          90: { value: 'hsl(195 100% 45%)' },
          100: { value: 'hsl(195 100% 40%)' },
        },
      },
      border: {
        primary: { value: 'hsl(220 15% 20%)' },
        secondary: { value: 'hsl(220 15% 25%)' },
        focus: { value: 'hsl(195 100% 50%)' },
      },
      shadow: {
        primary: { value: 'hsla(220, 20%, 2%, 0.5)' },
      },
    },
    components: {
      authenticator: {
        router: {
          boxShadow: { value: '0 4px 20px hsla(220, 20%, 2%, 0.5)' },
          borderWidth: { value: '1px' },
          borderColor: { value: 'hsl(220 15% 20%)' },
          backgroundColor: { value: 'hsl(220 18% 10%)' },
        },
      },
      button: {
        primary: {
          backgroundColor: { value: 'hsl(195 100% 50%)' },
          color: { value: 'hsl(220 20% 6%)' },
          borderColor: { value: 'hsl(195 100% 50%)' },
          _hover: {
            backgroundColor: { value: 'hsl(195 100% 45%)' },
            borderColor: { value: 'hsl(195 100% 45%)' },
          },
          _focus: {
            backgroundColor: { value: 'hsl(195 100% 45%)' },
            borderColor: { value: 'hsl(195 100% 50%)' },
            boxShadow: { value: '0 0 0 2px hsl(195 100% 50% / 0.3)' },
          },
          _active: {
            backgroundColor: { value: 'hsl(195 100% 40%)' },
          },
        },
        link: {
          color: { value: 'hsl(195 100% 50%)' },
          _hover: {
            color: { value: 'hsl(195 100% 60%)' },
            backgroundColor: { value: 'transparent' },
          },
        },
      },
      fieldcontrol: {
        backgroundColor: { value: 'hsl(220 15% 18%)' },
        borderColor: { value: 'hsl(220 15% 20%)' },
        color: { value: 'hsl(210 20% 95%)' },
        _focus: {
          borderColor: { value: 'hsl(195 100% 50%)' },
          boxShadow: { value: '0 0 0 2px hsl(195 100% 50% / 0.2)' },
        },
      },
      field: {
        label: {
          color: { value: 'hsl(210 20% 95%)' },
        },
      },
      heading: {
        color: { value: 'hsl(210 20% 95%)' },
      },
      text: {
        color: { value: 'hsl(215 15% 55%)' },
      },
      tabs: {
        item: {
          color: { value: 'hsl(215 15% 55%)' },
          _hover: {
            color: { value: 'hsl(210 20% 95%)' },
          },
          _active: {
            color: { value: 'hsl(195 100% 50%)' },
            borderColor: { value: 'hsl(195 100% 50%)' },
          },
        },
      },
    },
    radii: {
      small: { value: '0.5rem' },
      medium: { value: '0.75rem' },
      large: { value: '1rem' },
    },
    fonts: {
      default: {
        variable: { value: 'Inter, system-ui, sans-serif' },
        static: { value: 'Inter, system-ui, sans-serif' },
      },
    },
  },
});

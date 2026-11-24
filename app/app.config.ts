const largeControl = {
  defaultVariants: {
    size: 'xl' as const
  }
}

// Keep the trigger at 16 px and match the option text to the action menus.
const largeSelect = {
  ...largeControl,
  variants: {
    size: {
      xl: {
        item: 'text-sm',
        empty: 'text-sm'
      }
    }
  }
}

export default defineAppConfig({
  orderStatusBadge: {
    size: 'md' as const,
    mobileSize: 'lg' as const
  },
  ui: {
    colors: {
      primary: 'brand',
      secondary: 'violet',
      info: 'cyan',
      neutral: 'neutral'
    },
    dashboardNavbar: {
      slots: {
        title: 'text-base'
      }
    },
    navigationMenu: {
      slots: {
        link: 'text-sm',
        childLink: 'text-sm'
      }
    },
    tabs: {
      defaultVariants: {
        size: 'md'
      }
    },
    dropdownMenu: {
      defaultVariants: {
        size: 'md'
      }
    },
    badge: {
      variants: {
        size: {
          sm: {
            base: 'text-xs'
          }
        }
      }
    },
    button: largeControl,
    input: largeControl,
    inputNumber: largeControl,
    inputDate: largeControl,
    inputTime: largeControl,
    inputMenu: largeSelect,
    inputTags: largeControl,
    inputRating: largeControl,
    textarea: largeControl,
    select: largeSelect,
    selectMenu: largeSelect,
    checkbox: largeControl,
    checkboxGroup: largeControl,
    radioGroup: largeControl,
    switch: largeControl,
    pinInput: largeControl,
    calendar: largeControl,
    fileUpload: largeControl,
    colorPicker: largeControl,
    slider: largeControl
  }
})

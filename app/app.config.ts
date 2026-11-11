const largeControl = {
  defaultVariants: {
    size: 'xl' as const
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
    button: largeControl,
    input: largeControl,
    inputNumber: largeControl,
    inputDate: largeControl,
    inputTime: largeControl,
    inputMenu: largeControl,
    inputTags: largeControl,
    inputRating: largeControl,
    textarea: largeControl,
    select: largeControl,
    selectMenu: largeControl,
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

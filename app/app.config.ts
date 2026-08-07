const largeControl = {
  defaultVariants: {
    size: 'xl' as const
  }
}

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
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

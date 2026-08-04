export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    },
    input: {
      slots: {
        base: 'sm:gap-1.5 sm:px-2.5 sm:py-1.5',
        leading: 'sm:ps-2.5',
        trailing: 'sm:pe-2.5'
      },
      compoundVariants: [{
        leading: true,
        size: 'lg',
        class: 'sm:ps-9'
      }, {
        trailing: true,
        size: 'lg',
        class: 'sm:pe-9'
      }],
      defaultVariants: {
        size: 'lg'
      }
    }
  }
})

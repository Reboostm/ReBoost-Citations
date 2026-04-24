// Generate a simple, memorable master password
export const generateMasterPassword = () => {
  const adjectives = [
    'Bright', 'Swift', 'Strong', 'Clever', 'Smart', 'Quick',
    'Bold', 'Vivid', 'Grand', 'Fresh', 'Dynamic', 'Stellar'
  ]
  const nouns = [
    'Phoenix', 'Eagle', 'Rocket', 'Galaxy', 'Summit', 'Prime',
    'Titan', 'Apex', 'Nova', 'Zenith', 'Force', 'Knight'
  ]

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 99) + 1

  return `${adj}${noun}@${num}`
}

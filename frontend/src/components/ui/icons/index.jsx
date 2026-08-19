import Icon from './Icon'

export { default as Icon } from './Icon'
export { ICON_PATHS, ICON_ALIASES } from './paths'

/*
 * Compatibility layer for the five icon libraries this set replaced.
 *
 * Every call site used to import from react-icons/hi, /md, /fi, /fa or /io.
 * Rather than rewrite 78 usages across 40 files in one pass and risk breaking
 * a screen nobody would notice until much later, each legacy identifier is
 * re-exported here bound to its replacement drawing. Swapping the import path
 * is the whole change at the call site, and the rendered SVG is ours.
 *
 * New code should import { Icon } and use <Icon name="..." />. These names are
 * a bridge, not an API: as each screen phase rewrites its markup it should
 * drop its legacy names, and this block shrinks with it.
 *
 * Where the old set had an outline/solid pair, that distinction is preserved:
 * HiHeart is the filled heart used for a liked post, HiOutlineHeart the
 * unliked one.
 */

const bind = (name, solid) => {
    const C = (props) => <Icon name={name} solid={solid} {...props} />
    C.displayName = `Icon(${name}${solid ? ',solid' : ''})`
    return C
}

/* navigation, outline for unselected and solid for selected */
export const HiOutlineHome = bind('home')
export const HiHome = bind('home', true)
export const HiOutlineSearch = bind('search')
export const HiSearch = bind('search')
export const HiOutlineChatAlt2 = bind('chat')
export const HiChatAlt2 = bind('chat')
export const HiOutlineChat = bind('chat')
export const HiOutlineBell = bind('bell')
export const HiBell = bind('bell', true)

/* post actions */
export const HiOutlineHeart = bind('heart')
export const HiHeart = bind('heart', true)
export const HiOutlineBookmark = bind('bookmark')
export const HiBookmark = bind('bookmark', true)
export const HiShare = bind('share')
export const HiReply = bind('reply')
export const FiSend = bind('send')

/* composer and media */
export const HiPhotograph = bind('image')
export const HiCamera = bind('camera')
export const HiFilm = bind('film')
export const HiPlay = bind('play')
export const HiPause = bind('pause')
export const HiCloudUpload = bind('upload')
export const HiPaperClip = bind('paperclip')
export const HiEmojiHappy = bind('emoji')
export const FiAlignLeft = bind('align-left')
export const FiAlignCenter = bind('align-center')
export const FiAlignRight = bind('align-right')
export const HiVolumeUp = bind('volume-on')
export const HiVolumeOff = bind('volume-off')

/* status and feedback */
export const HiCheck = bind('check')
export const IoCheckmark = bind('check')
export const IoCheckmarkDone = bind('check-double')
export const HiCheckCircle = bind('check-circle')
export const HiBadgeCheck = bind('verified')
export const HiExclamationCircle = bind('alert-circle')
export const HiInformationCircle = bind('info')
export const HiShieldCheck = bind('shield')
export const HiOutlineShieldCheck = bind('shield')
export const HiFire = bind('fire')
export const HiLightningBolt = bind('bolt')
export const HiClock = bind('clock')
export const HiTrendingUp = bind('trending-up')

/* identity and access */
export const HiUser = bind('user')
export const HiUserAdd = bind('user-add')
export const HiUsers = bind('users')
export const HiLogin = bind('login')
export const HiLogout = bind('logout')
export const HiOutlineLogout = bind('logout')
export const HiExit = bind('logout')
export const HiLockClosed = bind('lock')
export const HiMail = bind('mail')
export const HiAtSymbol = bind('at')
export const MdVisibility = bind('eye')
export const MdVisibilityOff = bind('eye-off')
export const HiSwitchHorizontal = bind('switch-horizontal')

/* structure and chrome */
export const HiX = bind('x')
export const HiPlus = bind('plus')
export const HiOutlinePlusCircle = bind('plus-circle')
export const HiMenu = bind('menu')
export const HiDotsHorizontal = bind('dots-horizontal')
export const HiDotsVertical = bind('dots-vertical')
export const HiChevronLeft = bind('chevron-left')
export const HiChevronRight = bind('chevron-right')
export const HiArrowLeft = bind('arrow-left')
export const HiArrowRight = bind('arrow-right')
export const HiViewGrid = bind('grid')
export const HiCollection = bind('collection')
export const HiRefresh = bind('refresh')
export const HiLink = bind('link')
export const HiGlobe = bind('globe')
export const HiSun = bind('sun')
export const HiMoon = bind('moon')
export const HiCog = bind('cog')
export const HiTrash = bind('trash')
export const HiPencil = bind('pencil')
export const HiPencilAlt = bind('pencil')
export const HiFlag = bind('flag')

/* admin console */
export const HiDatabase = bind('database')
export const HiHardDrive = bind('database')
export const HiServer = bind('server')
export const HiTerminal = bind('terminal')
export const HiClipboardList = bind('clipboard')

/* brand */
export const FaLinkedin = bind('linkedin')

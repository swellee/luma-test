export const apiHost = import.meta.env.VITE_API_HOST;

export const router_register = "/register";
export const router_login = "/login";
export const router_profile = "/profile";
export const router_reset_password = "/reset-password";

export const router_home = "/";
export const router_dashboard = "/dashboard";
export const router_dashboard_users = "users";
export const router_dashboard_packages = "packages";
export const router_dashboard_packages_edit = "packages/edit/:id";
export const router_dashboard_tasks = "tasks";
export const router_dashboard_messages = "messages";
export const router_terms = "/terms";
export const routr_annotate = "/annotate/:id";
export const router_review = "/review/:id";
export const default_avatar = "https://image.baidu.com/search/detail?adpicid=0&b_applid=10181689360572487209&bdtype=0&commodity=&copyright=&cs=3903635361%2C3863766007&di=7565560840087142401&fr=click-pic&fromurl=http%253A%252F%252Fwww.1688.com%252Fhuo%252Fb-CAD6B9A4C2FEBBAD.html&gsm=1e&hd=&height=0&hot=&ic=&ie=utf-8&imgformat=&imgratio=&imgspn=0&is=0%2C0&isImgSet=&latest=&lid=&lm=&objurl=https%253A%252F%252Fgimg2.baidu.com%252Fimage_search%252Fsrc%253Dhttp%25253A%25252F%25252Fg-search1.alicdn.com%25252Fimg%25252Fbao%25252Fuploaded%25252Fi3%25252F832312349%25252FO1CN015PXYss1TDt4mj9YMH_%252521%252521832312349.jpg_300x300.jpg%2526refer%253Dhttp%25253A%25252F%25252Fg-search1.alicdn.com%2526app%253D2002%2526size%253Df9999%252C10000%2526q%253Da80%2526n%253D0%2526g%253D0n%2526fmt%253Dauto%253Fsec%253D1767504212%2526t%253D320a679270f91c3f5f8d7036fbdba1be&os=344303905%2C2156020746&pd=image_content&pi=0&pn=5&rn=1&simid=3903635361%2C3863766007&tn=baiduimagedetail&width=0&word=%E5%A4%B4%E5%83%8F%E4%BA%BA%E7%89%A9&z=5"

export const roleOpts = (allowAdmin?: boolean) => [
  { value: "annotator", label: "annotator" },
  { value: "reviewer", label: "Reviewer" },
  ...(allowAdmin ? [{ value: "admin", label: "Admin" }] : []),
]

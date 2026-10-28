import { classes, students, teachers } from '../data/schoolData.js'
import { DEMO_USER } from '../data/branding.js'
const SESSION_KEY='northstar-demo-session'
export function getTeacherById(id){return teachers.find(t=>t.id===id)||null}
export function getClassStats(id){const list=getStudentsByClass(id);return {total:list.length,boys:list.filter(s=>s.gender==='Male').length,girls:list.filter(s=>s.gender==='Female').length,unknownGender:list.filter(s=>s.gender!=='Male'&&s.gender!=='Female').length}}
const detail=room=>({...room,teacher:getTeacherById(room.teacherId)?.name||'Unassigned',stats:getClassStats(room.id)})
// Synchronous for the local dataset. Keep the service boundary replaceable by an API later.
export function getDashboardStats(){const totalBoys=students.filter(s=>s.gender==='Male').length,totalGirls=students.filter(s=>s.gender==='Female').length;return {totalStudents:students.length,totalBoys,totalGirls,totalUnknownGender:students.length-totalBoys-totalGirls,totalClasses:classes.length}}
export function getClasses(){return classes.map(detail)}
export function getClassById(id){const room=classes.find(c=>c.id===id);return room?detail(room):null}
export function getStudentsByClass(id){const room=classes.find(c=>c.id===id);return room?students.filter(s=>s.classId===id&&s.section===room.section):[]}
export function searchStudents(id,query){const q=query.trim().toLowerCase();return getStudentsByClass(id).filter(s=>!q||s.name.toLowerCase().includes(q)||s.admissionNumber.toLowerCase().includes(q)||String(s.rollNumber).includes(q))}
export async function loginDemo({email,password}){if(!email?.trim()||!password)return {ok:false,error:'Enter your email address and password.'};if(email.trim().toLowerCase()!=='demo@school.com'||password!=='SchoolDemo123!')return {ok:false,error:'That email and password don’t match. Try the demo credentials shown below.'};const user={...DEMO_USER};localStorage.setItem(SESSION_KEY,JSON.stringify(user));return {ok:true,user}}
export function getCurrentUser(){try{const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');return session?{...DEMO_USER,email:session.email||DEMO_USER.email}:null}catch{return null}}
export function logoutDemo(){localStorage.removeItem(SESSION_KEY)}

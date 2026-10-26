import { classes, students, teachers } from '../data/schoolData.js'
const SESSION_KEY='northstar-demo-session'
const countsFor=id=>{const list=students.filter(s=>s.classId===id);return {total:list.length,boys:list.filter(s=>s.gender==='Male').length,girls:list.filter(s=>s.gender==='Female').length}}
const detail=room=>({...room,teacher:teachers.find(t=>t.id===room.teacherId)?.name||'Unassigned',stats:countsFor(room.id)})
export async function getDashboardStats(){return {totalStudents:students.length,totalBoys:students.filter(s=>s.gender==='Male').length,totalGirls:students.filter(s=>s.gender==='Female').length,totalClasses:classes.length}}
export function getClasses(){return classes.map(detail)}
export function getClassById(id){const room=classes.find(c=>c.id===id);return room?detail(room):null}
export function getStudentsByClass(id){return students.filter(s=>s.classId===id)}
export function searchStudents(id,query){const q=query.trim().toLowerCase();return getStudentsByClass(id).filter(s=>!q||s.name.toLowerCase().includes(q)||s.admissionNumber.toLowerCase().includes(q)||String(s.rollNumber).includes(q))}
export async function loginDemo({email,password}){if(!email?.trim()||!password)return {ok:false,error:'Enter your email address and password.'};if(email.trim().toLowerCase()!=='demo@school.com'||password!=='SchoolDemo123!')return {ok:false,error:'That email and password don’t match. Try the demo credentials shown below.'};const user={name:'Alex Morgan',email:'demo@school.com'};localStorage.setItem(SESSION_KEY,JSON.stringify(user));return {ok:true,user}}
export function getCurrentUser(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
export function logoutDemo(){localStorage.removeItem(SESSION_KEY)}

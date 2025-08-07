const mongoose = require('mongoose');
const User = require('../../models/usermodel'); // Adjust path as needed

const fs = require('fs');
const crypto = require('crypto');

// MongoDB connection string
const MONGO_URI = 'mongodb+srv://rajsony1113:LORBg1gkm7X5FWZ8@cluster0.ckfeyfa.mongodb.net/newcollege?retryWrites=true&w=majority&appName=Cluster0';

// Default password for all users
const DEFAULT_PASSWORD = 'BGS@1234';

const STUDENT_DATA = [
    { usn: "1MP22AD001", name: "ABHISHEK HG", email: "1mp22ad001@gmail.com" },
    { usn: "1MP22AD002", name: "AMAN PANDEY", email: "1mp22ad002@gmail.com" },
    { usn: "1MP22AD003", name: "AMOGH R KRISHNA", email: "1mp22ad003@gmail.com" },
    { usn: "1MP22AD004", name: "AMOOLYA M SHANBHAG", email: "1mp22ad004@gmail.com" },
    { usn: "1MP22AD005", name: "AMULYA R KRISHNA", email: "1mp22ad005@gmail.com" },
    { usn: "1MP22AD006", name: "ASHUTOSH KUMAR JHA S", email: "1mp22ad006@gmail.com" },
    { usn: "1MP22AD007", name: "BHADREESH S M", email: "1mp22ad007@gmail.com" },
    { usn: "1MP22AD008", name: "BRUNDA R", email: "1mp22ad008@gmail.com" },
    { usn: "1MP22AD009", name: "CHARAN SRI HARIP", email: "1mp22ad009@gmail.com" },
    { usn: "1MP22AD010", name: "CHETHANA M", email: "1mp22ad010@gmail.com" },
    { usn: "1MP22AD011", name: "CHIRAYU K", email: "chiru1mp22ad011@gmail.com" },
    { usn: "1MP22AD012", name: "DARSHAN N A", email: "1mp22ad012@gmail.com" },
    { usn: "1MP22AD013", name: "DARSHAN YADAV", email: "1mp22add013@gmail.com" },
    { usn: "1MP22AD014", name: "DEEKSHITHA S", email: "1mp22ad014@gmail.com" },
    { usn: "1MP22AD015", name: "SANKE DHIKSHITHA", email: "1mp22ad015@gmail.com" },
    { usn: "1MP22AD016", name: "GV DARSHAN", email: "1mp22ad016@gmail.com" },
    { usn: "1MP22AD017", name: "GAGAN GOWDA BM", email: "1mp22ad017@gmail.com" },
    { usn: "1MP22AD018", name: "GANAPRIYA V", email: "1mp22ad018@gmail.com" },
    { usn: "1MP22AD019", name: "GEETHA.N", email: "1mp22ad019@gmail.com" },
    { usn: "1MP22AD020", name: "GURU KIRAN.B", email: "1mp22ad020@gmail.com" },
    { usn: "1MP22AD022", name: "HANISHA SM", email: "1mp22ad022@gmail.com" },
    { usn: "1MP22AD023", name: "HITHESH M N", email: "1mp22ad023@gmail.com" },
    { usn: "1MP22AD024", name: "HRUSHIKESH", email: "1mp22ad024hrushi@gmail.com" },
    { usn: "1MP22AD025", name: "IMPANA S", email: "1mp22ad025@gmail.com" },
    { usn: "1MP22AD026", name: "KEERTHAN G V", email: "1mp22ad026@gmail.com" },
    { usn: "1MP22AD027", name: "KEERTHANA B", email: "1mp22ad027@gmail.com" },
    { usn: "1MP22AD028", name: "KHUSHI KAVERIAMMA CR", email: "1mp22ad028@gmail.com" },
    { usn: "1MP22AD029", name: "S S KISHAN", email: "1mp22ad029@gmail.com" },
    { usn: "1MP22AD030", name: "KUSUMA V", email: "1mp22ad030@gmail.com" },
    { usn: "1MP22AD031", name: "LIKITHA B", email: "1mp22ad031@gmail.com" },
    { usn: "1MP22AD032", name: "MANISHA M", email: "1mp22ad032@gmail.com" },
    { usn: "1MP22AD033", name: "MEGHANA B", email: "1mp22ad033@gmail.com" },
    { usn: "1MP22AD034", name: "MOHITH S", email: "1mp22ad034@gmail.com" },
    { usn: "1MP22AD035", name: "NAVEEN S", email: "1mp22ad035@gmail.com" },
    { usn: "1MP22AD036", name: "NIHARIKA SHAILENDRA KUMAR", email: "1mp22ad036@gmail.com" },
    { usn: "1MP22AD037", name: "NIKHIL N C", email: "1mp22ad037@gmail.com" },
    { usn: "1MP22AD038", name: "NIKITH GOWDA H S", email: "1mp22ad038@gmail.com" },
    { usn: "1MP22AD039", name: "NIRANJAN GOWDA K S", email: "1mp22ad039@gmail.com" },
    { usn: "1MP22AD040", name: "NISARGA HOSPET", email: "1mp22ad040@gmail.com" },
    { usn: "1MP22AD041", name: "NISCHITHA S", email: "1mp22ad041@gmail.com" },
    { usn: "1MP22AD042", name: "PRIYA HG", email: "1mp22ad042@gmail.com" },
    { usn: "1MP22AD043", name: "PRIYANKA PANDEY", email: "1mp22ad043@gmail.com" },
    { usn: "1MP22AD044", name: "RAKSHITA GIRIDHAR HIREMATH", email: "1mp22ad044@gmail.com" },
    { usn: "1MP22AD045", name: "RUCHITHA S", email: "1mp22ad045@gmail.com" },
    { usn: "1MP22AD046", name: "SANJANA M", email: "1mp22ad046@gmail.com" },
    { usn: "1MP22AD047", name: "SANJAY P S", email: "1mp22ad047@gmail.com" },
    { usn: "1MP22AD048", name: "SHEETAL VINAYAK BANTWALKAR", email: "1mp22ad048@gmail.com" },
    { usn: "1MP22AD049", name: "SHIVANGI GUPTA", email: "1mp22ad049@gmail.com" },
    { usn: "1MP22AD050", name: "SHRAVANI E", email: "1mp22ad050@gmail.com" },
    { usn: "1MP22AD051", name: "SHREYA P", email: "1mp22ad051@gmail.com" },
    { usn: "1MP22AD053", name: "SIRI S", email: "1mp22ad053@gmail.com" },
    { usn: "1MP22AD054", name: "SNEHA KR", email: "1mp22ad054@gmail.com" },
    { usn: "1MP22AD055", name: "SUSHMITHA C", email: "1mp22ad055@gmail.com" },
    { usn: "1MP22AD056", name: "SWAROOP S", email: "1mp22ad056@gmail.com" },
    { usn: "1MP22AD057", name: "T AKSHAYA", email: "1mp22ad057@gmail.com" },
    { usn: "1MP22AD058", name: "TANISHA K S", email: "1mp22ad058@gmail.com" },
    { usn: "1MP22AD059", name: "TANUSHREE B INDRESH", email: "1mp22ad059@gmail.com" },
    { usn: "1MP22AD060", name: "TEJAS GOWDA S", email: "1mp22ad060@gmail.com" },
    { usn: "1MP22AD061", name: "TEJASWINI N", email: "1mp22ad061@gmail.com" },
    { usn: "1MP22AD062", name: "TRUPTI V HUBLI", email: "1mp22ad062@gmail.com" },
    { usn: "1MP22AD063", name: "VISHWAJEETH S", email: "1mp22ad063@gmail.com" },
    { usn: "1MP22AD021", name: "HAMSA M N", email: "1mp22ad021@gmail.com" },
    { usn: "1MP23AD400", name: "JEEVAN C B", email: "1mp23ad400@gmail.com" },
    { usn: "1MP23AD401", name: "KARTHIK U", email: "1mp23ad.401@gmail.com" },
    { usn: "1MP23AD402", name: "MANOJ SN", email: "23ad402@gmail.com" },
    { usn: "1MP23AD403", name: "RAKSHITH KUMAR S", email: "1mp23ad403@gmail.com" },
    { usn: "1MP23AD404", name: "YASHAS K V", email: "1MP23AD404@gmail.com" },
    { usn: "1MP22AI001", name: "ADITYA S", email: "1mp22ai001@gmail.com" },
    { usn: "1MP22AI002", name: "AKASH C", email: "1mp22ai002@gmail.com" },
    { usn: "1MP22AI003", name: "AKSHATHA M A", email: "1mp22ai003@gmail.com" },
    { usn: "1MP22AI004", name: "ANKITHA D", email: "1mp22ai004@gmail.com" },
    { usn: "1MP22AI005", name: "ANSH AJIT SALUNKE", email: "1mp22ai005@gmail.com" },
    { usn: "1MP22AI006", name: "ASHUTOSH KUMAR", email: "1mp22ai006@gmail.com" },
    { usn: "1MP22AI007", name: "BENAKESH H", email: "imp22ai007@gmail.com" },
    { usn: "1MP22AI008", name: "BRINDAA C", email: "1mp22ai008@gmail.com" },
    { usn: "1MP22AI009", name: "DHRUTHI A R", email: "1mp22ai009@gmail.com" },
    { usn: "1MP22AI010", name: "ESHWAR S", email: "1mp22ai010@gmail.com" },
    { usn: "1MP22AI011", name: "G SINDHU", email: "1mp22ai011@gmail.com" },
    { usn: "1MP22AI012", name: "GAGAN SAI DEEP P", email: "1mp22ai012@gmail.com" },
    { usn: "1MP22AI013", name: "GAGAN T S", email: "1mp22ai013@gmail.com" },
    { usn: "1MP22AI014", name: "HARSHA C", email: "1mp22ai014@gmail.com" },
    { usn: "1MP22AI015", name: "HARSHITH MARDITHAYA", email: "1mp22ai015@gmail.com" },
    { usn: "1MP22AI016", name: "JAWAHAR K S", email: "1mp22ai016@gmail.com" },
    { usn: "1MP22AI017", name: "KARTHIK G", email: "1mp22ai017@gmail.com" },
    { usn: "1MP22AI018", name: "KEERTHANA SHIVAKUMAR", email: "1mp22ai018@gmail.com" },
    { usn: "1MP22AI019", name: "KIRAN M", email: "1mp22ai019@gmail.com" },
    { usn: "1MP22AI020", name: "KISHORE S", email: "1mp22ai020kishore@gmail.com" },
    { usn: "1MP22AI021", name: "KUSUMANJALI M N", email: "1mp22ai021@gmail.com" },
    { usn: "1MP22AI022", name: "LEKHANA BR", email: "1mp22ai022@gmail.com" },
    { usn: "1MP22AI023", name: "LEKHANA M S", email: "1mp22ai023@gmail.com" },
    { usn: "1MP22AI024", name: "LIKHITHA MS", email: "1mp22ai024@gmail.com" },
    { usn: "1MP22AI025", name: "M R SIDDARTH", email: "1mp22ai025@gmail.com" },
    { usn: "1MP22AI026", name: "MANUSHA P Y", email: "1mp22ai026@gmail.com" },
    { usn: "1MP22AI027", name: "MEGHA M A", email: "1mp22ai027@gmail.com" },
    { usn: "1MP22AI028", name: "MOHITH V KRISHNAM", email: "1mp22ai028@gmail.com" },
    { usn: "1MP22AI029", name: "MONISH RAJESH", email: "1mp22ai029@gmail.com" },
    { usn: "1MP22AI030", name: "MOUNA K", email: "1mp22ai030@gmail.com" },
    { usn: "1MP22AI031", name: "NAMAGUNDLA KRISHNA CHAITANYA", email: "1mp22ai031@gmail.com" },
    { usn: "1MP22AI032", name: "NAMITHA H M", email: "1mp22ai032@gmail.com" },
    { usn: "1MP22AI033", name: "NARAIN M", email: "1mp22ai033@gmail.com" },
    { usn: "1MP22AI034", name: "NAYANA B R", email: "1mp22ai034@gmail.com" },
    { usn: "1MP22AI035", name: "PALLAVI T", email: "1mp22ai035@gmail.com" },
    { usn: "1MP22AI036", name: "PARIKSHITH N", email: "1mp22ai036@gmail.com" },
    { usn: "1MP22AI037", name: "PAVAN N REDDY", email: "1mp22ai037@gmail.com" },
    { usn: "1MP22AI038", name: "POOJA.M.S", email: "1mp22ai038@gmail.com" },
    { usn: "1MP22AI039", name: "POORNIMA H U", email: "1mp22ai039@gmail.com" },
    { usn: "1MP22AI040", name: "PRERANA NIDONI", email: "1mp22ai040@gmail.com" },
    { usn: "1MP22AI041", name: "PRUTHVINATH REDDY J", email: "1mp22ai041@gmail.com" },
    { usn: "1MP22AI042", name: "RAKSHA D", email: "1mp22ai042@gmail.com" },
    { usn: "1MP22AI043", name: "RAMYASHREE J", email: "1mp22ai043@gmail.com" },
    { usn: "1MP22AI044", name: "RANJITHA R", email: "1mp22ai044@gmail.com" },
    { usn: "1MP22AI045", name: "RHEA FATIMA ESTIBEIRO", email: "1mp22ai045@gmail.com" },
    { usn: "1MP22AI046", name: "SANJANA M", email: "1mp22ai046@gmail.com" },
    { usn: "1MP22AI047", name: "SATHYA PUSHANA PRAMOD", email: "1mp22ai047@gmail.com" },
    { usn: "1MP22AI048", name: "SHASHANK S GOWDA", email: "1mp22ai048@gmail.com" },
    { usn: "1MP22AI049", name: "SHREYA H", email: "1mp22ai049@gmail.com" },
    { usn: "1MP22AI050", name: "SINCHAN DECHAKKA MK", email: "1mp22ai050@gmail.com" },
    { usn: "1MP22AI051", name: "SPANDANA", email: "1mp22ai051@gmail.com" },
    { usn: "1MP22AI052", name: "SRUJAN PATEL R", email: "1mp22ai052@gmail.com" },
    { usn: "1MP22AI053", name: "B P SUCHITRA", email: "1mp22ai053@gmail.com" },
    { usn: "1MP22AI054", name: "SURAJ V", email: "1mp22ai054@gmail.com" },
    { usn: "1MP22AI055", name: "SYED NADEEM AHMED", email: "1mp22ai055@gmail.com" },
    { usn: "1MP22AI056", name: "TANUSHA N", email: "1mp22ai056@gmail.com" },
    { usn: "1MP22AI057", name: "TEJAS KRISHNA A S", email: "1mp22ai057@gmail.com" },
    { usn: "1MP22AI058", name: "THANVI B", email: "1mp22ai058@gmail.com" },
    { usn: "1MP22AI059", name: "VEDIK S", email: "1MP22AI059@gmail.com" },
    { usn: "1MP22AI060", name: "VEERENDRA", email: "1mp22ai060@gmail.com" },
    { usn: "1MP22AI061", name: "VIHAS Y HALKURIKE", email: "1mp22ai061@gmail.com" },
    { usn: "1MP22AI062", name: "VINAY GOWDA R", email: "1mp22ai062@gmail.com" },
    { usn: "1MP22AI063", name: "YASHASWINI D", email: "1mp22ai063@gmail.com" },
    { usn: "1MP23AI400", name: "CHARAN RAJ C", email: "1mp23ai400@gmail.com" },
    { usn: "1MP23AI401", name: "GAGAN KUMAR S", email: "1mp23ai401@gmail.com" },
    { usn: "1MP23AI402", name: "JAYASHREE P", email: "1mp23ai402@gmail.com" },
    { usn: "1MP23AI403", name: "MANOJ S C", email: "1mp23ai403@gmail.com" },
    { usn: "1MP23AI404", name: "NIRMALASHREE M", email: "1mp23ai404@gmail.com" },
    { usn: "1MP23AI405", name: "SUMANTH M", email: "1mp23ai405@gmail.com" },
    { usn: "1MP22CS001", name: "ABHISHEK GOWDA S", email: "1mp22cs001@gmail.com" },
    { usn: "1MP22CS002", name: "KV ABISHEK", email: "1mp22cs002@gmail.com" },
    { usn: "1MP22CS003", name: "ADITYA SRINIVASAN", email: "1mp22cs003@gmail.com" },
    { usn: "1MP22CS004", name: "AISHWARYA G S", email: "1mp22cs004@gmail.com" },
    { usn: "1MP22CS005", name: "ANANYA ANAND TUMARNAVIS", email: "1mp22cs005@gmail.com" },
    { usn: "1MP22CS006", name: "ANANYA H V", email: "1mp22cs006@gmail.com" },
    { usn: "1MP22CS007", name: "ANKITHA B R", email: "1mp22cs007@gmail.com" },
    { usn: "1MP22CS008", name: "ARJUN P GUPTA", email: "1mp22cs008@gmail.com" },
    { usn: "1MP22CS009", name: "AYESHA MUSKAN", email: "1mp22cs009@gmail.com" },
    { usn: "1MP22CS010", name: "DEVI SUREKHA B", email: "1mp22cs010@gmail.com" },
    { usn: "1MP22CS011", name: "CHANDANA RAMESH", email: "1mp22cs011@gmail.com" },
    { usn: "1MP22CS012", name: "CHETHAN C J", email: "1mp22cs012@gmail.com" },
    { usn: "1MP22CS013", name: "DARSHAN BY", email: "1mp22cs013@gmail.com" },
    { usn: "1MP22CS014", name: "DEEPASHREE K R", email: "1mp22cs014@gmail.com" },
    { usn: "1MP22CS015", name: "GEETHANJALI R", email: "1mp22cs015@gmail.com" },
    { usn: "1MP22CS016", name: "GIRIDHARA D", email: "1mp22cs016@gmail.com" },
    { usn: "1MP22CS017", name: "GOPIKA R", email: "1mp22cs017@gmail.com" },
    { usn: "1MP22CS018", name: "HARSHA GOWDA R", email: "1mp22cs018@gmail.com" },
    { usn: "1MP22CS019", name: "HARSHA R", email: "1mp22cs019@gmail.com" },
    { usn: "1MP22CS020", name: "HEMANTH GOWDA H N", email: "1mp22cs020@gmail.com" },
    { usn: "1MP22CS021", name: "HEMANTH KUMAR", email: "1mp22cs021@gmail.com" },
    { usn: "1MP22CS023", name: "KARTHIK V B", email: "1mp22cs023@gmail.com" },
    { usn: "1MP22CS024", name: "KAVANA B H", email: "1mp22cs024@gmail.com" },
    { usn: "1MP22CS025", name: "KIRAN R", email: "1mp22cs025@gmail.com" },
    { usn: "1MP22CS026", name: "KUSUMA N", email: "1mp22cs026@gmail.com" },
    { usn: "1MP22CS027", name: "LALITRAJ RAYAPPA R", email: "1mp22cs027@gmail.com" },
    { usn: "1MP22CS028", name: "LAXMAN MUDENUR", email: "1mp22cs028@gmail.com" },
    { usn: "1MP22CS029", name: "MAHAN J SHETTY", email: "1mp22cs029@gmail.com" },
    { usn: "1MP22CS030", name: "MANOJ B R", email: "1mp22cs030@gmail.com" },
    { usn: "1MP22CS031", name: "MANOJA D", email: "1mp22cs031@gmail.com" },
    { usn: "1MP22CS032", name: "MANUSHREE V", email: "1mp22cs032@gmail.com" },
    { usn: "1MP22CS033", name: "MELWIN VARKEY", email: "1mp22cs033@gmail.com" },
    { usn: "1MP22CS034", name: "MOHAMMED HAYATH BABA", email: "1mp22cs034@gmail.com" },
    { usn: "1MP22CS035", name: "NIHAAL KRISHNA", email: "1mp22cs035@gmail.com" },
    { usn: "1MP22CS036", name: "PAVITHRA HR", email: "1mp22cs036@gmail.com" },
    { usn: "1MP22CS037", name: "PREKSHA DP.", email: "1mp22cs037@gmail.com" },
    { usn: "1MP22CS038", name: "PRERNA RAO", email: "1mp22cs038@gmail.com" },
    { usn: "1MP22CS039", name: "RAHUL S", email: "1mp22cs039@gmail.com" },
    { usn: "1MP22CS040", name: "RAKSHITHA S", email: "1mp22cs040@gmail.com" },
    { usn: "1MP22CS041", name: "RAMYA S", email: "1mp22cs041@gmail.com" },
    { usn: "1MP22CS042", name: "RENUSHREE HS", email: "1mp22cs042@gmail.com" },
    { usn: "1MP22CS043", name: "RIHAM HUSSAIN", email: "1mp22cs043@gmail.com" },
    { usn: "1MP22CS044", name: "ROHINI M", email: "1mp22cs044@gmail.com" },
    { usn: "1MP22CS045", name: "SAHANA M GOWDA", email: "1mp22cs045@gmail.com" },
    { usn: "1MP22CS046", name: "SANATH S GOWDA", email: "1mp22cs046@gmail.com" },
    { usn: "1MP22CS047", name: "SANTOSH S", email: "1mp22cs047@gmail.com" },
    { usn: "1MP22CS048", name: "SECHANA VENKATESH", email: "1mp22cs048@gmail.com" },
    { usn: "1MP22CS049", name: "SEVANTHI. V", email: "1mp22cs049@gmail.com" },
    { usn: "1MP22CS050", name: "SHREYA B K GOWDA", email: "1mp22cs050@gmail.com" },
    { usn: "1MP22CS051", name: "SNEHA JAYARAM", email: "1mp22cs051@gmail.com" },
    { usn: "1MP22CS052", name: "SOMNATH", email: "1mp22cs052@gmail.com" },
    { usn: "1MP22CS053", name: "SOUNDARYA H S", email: "1mp22cs053@gmail.com" },
    { usn: "1MP22CS054", name: "SRAJANYA SHETTY", email: "1MP22CS054@gmail.com" },
    { usn: "1MP22CS055", name: "SRIHARI K", email: "1mp22cs055@gmail.com" },
    { usn: "1MP22CS056", name: "SRUJAN PANCHAJANYA S S", email: "1mp22cs056@gmail.com" },
    { usn: "1MP22CS057", name: "SUHAS NAIK", email: "1mp22cs057@gmail.com" },
    { usn: "1MP22CS058", name: "VARSHA", email: "1mp22cs058@gmail.com" },
    { usn: "1MP22CS059", name: "VIKAS", email: "1mp22cs059@gmail.com" },
    { usn: "1MP22CS060", name: "VILAS C.P", email: "1mp22cs060@gmail.com" },
    { usn: "1MP22CS061", name: "VINOD GOWDA T M", email: "1mp22cs061@gmail.com" },
    { usn: "1MP22CS062", name: "YASHWANTH M S", email: "1mp22cs062@gmail.com" },
    { usn: "1MP22CS063", name: "YUKTHA .P", email: "1mp22cs063@gmail.com" },
    { usn: "1MP23CS401", name: "DIVYASHREE P", email: "1mp23cs401@gmail.com" },
    { usn: "1MP23CS402", name: "LAKSHMI A", email: "1mp23cs402@gmail.com" },
    { usn: "1MP23CS403", name: "RANJITH KUMAR K R", email: "1mp23cs403@gmail.com" },
    { usn: "1MP23CS404", name: "SATHWIK R", email: "1mp23cs404@gmail.com" },
    { usn: "1MP23CS405", name: "SHIRISHA V C", email: "1mp23cs405@gmail.com" },
    { usn: "1MP22CG001", name: "A SHEEBA TASKEEN", email: "1mp22cg001@gmail.com" },
    { usn: "1MP22CG002", name: "ABHISHEK GANGAPUR", email: "1mp22cg002@gmail.com" },
    { usn: "1MP22CG003", name: "AKSHARA CR", email: "1mp22cg003@gmail.com" },
    { usn: "1MP22CG004", name: "AKSHOBHYA THEERHA", email: "1mp22cg004@gmail.com" },
    { usn: "1MP22CG005", name: "AMITH", email: "1mp22cg005@gmail.com" },
    { usn: "1MP22CG006", name: "AMRUTHA K", email: "1mp22cg006@gmail.com" },
    { usn: "1MP22CG007", name: "AYESHA N", email: "1mp22cg007@gmail.com" },
    { usn: "1MP22CG008", name: "BADRI VISHAL S", email: "1mp22cg008@gmail.com" },
    { usn: "1MP22CG009", name: "BHAVANA D RATI", email: "1mp22cg009@gmail.com" },
    { usn: "1MP22CG010", name: "C SAI KEERTHANA", email: "1mp22cg010@gmail.com" },
    { usn: "1MP22CG011", name: "CHAITHANYA.K", email: "1mp22cg011@gmail.com" },
    { usn: "1MP22CG012", name: "CHANDANA Y S", email: "1mp22cg012@gmail.com" },
    { usn: "1MP22CG013", name: "DHANYASHREE G", email: "1mp22cg013@gmail.com" },
    { usn: "1MP22CG014", name: "DIKSHA G", email: "1mp22cg014@gmail.com" },
    { usn: "1MP22CG015", name: "DILIP KUMAR K", email: "1MP22CG015@gmail.com" },
    { usn: "1MP22CG016", name: "EEDIGA HIMABINDU", email: "1mp22cg016@gmail.com" },
    { usn: "1MP22CG017", name: "GADAPUTI BHUVANESWARI", email: "1mp22cg017@gmail.com" },
    { usn: "1MP22CG018", name: "GANESHA S", email: "1mp22cg018@gmail.com" },
    { usn: "1MP22CG019", name: "HARSHITHA HV", email: "1mp22cg019@gmail.com" },
    { usn: "1MP22CG020", name: "HEMANTH R", email: "1mp22cg020@gmail.com" },
    { usn: "1MP22CG021", name: "HONALU SHEKAR M", email: "1mp22cg021@gmail.com" },
    { usn: "1MP22CG022", name: "JAYANTH K", email: "1mp22cg022@gmail.com" },
    { usn: "1MP22CG023", name: "JAYASHREE H N", email: "1mp22cg023@gmail.com" },
    { usn: "1MP22CG024", name: "K S HARIKRISHNA", email: "1mp22cg024@gmail.com" },
    { usn: "1MP22CG026", name: "KIRAN KUMAR N A", email: "1mp22cg026@gmail.com" },
    { usn: "1MP22CG027", name: "KRUTHIKA M", email: "1mp22cg027@gmail.com" },
    { usn: "1MP22CG028", name: "KRUTHIKA S", email: "1mp22cg028@gmail.com" },
    { usn: "1MP22CG029", name: "KUSUM A", email: "1mp22cg029@gmail.com" },
    { usn: "1MP22CG030", name: "LIKHITHA J N", email: "1mp22cg030@gmail.com" },
    { usn: "1MP22CG031", name: "M SHASHANK", email: "1mp22cg031@gmail.com" },
    { usn: "1MP22CG032", name: "MADHUSHREE V", email: "1mp22cg032@gmail.com" },
    { usn: "1MP22CG033", name: "MANASA BS", email: "1mp22cg033@gmail.com" },
    { usn: "1MP22CG034", name: "MOHAMMED ROSHAN PASHA", email: "1mp22cg034@gmail.com" },
    { usn: "1MP22CG035", name: "MONISHA S", email: "1mp22cg035@gmail.com" },
    { usn: "1MP22CG036", name: "NAVYASHREE J", email: "1mp22cg036@gmail.com" },
    { usn: "1MP22CG037", name: "NISARGA K", email: "1mp22cg037@gmail.com" },
    { usn: "1MP22CG038", name: "NISARGA V", email: "1mp22cg038@gmail.com" },
    { usn: "1MP22CG039", name: "PHALGUNI P PURANIK", email: "1mp22cg039@gmail.com" },
    { usn: "1MP22CG040", name: "PRAJWAL K", email: "1mp22cg040@gmail.com" },
    { usn: "1MP22CG041", name: "PRAJWAL K N", email: "1mp22cg041@gmail.com" },
    { usn: "1MP22CG042", name: "PRATHEEK KUMAR T N", email: "1mp22cg042@gmail.com" },
    { usn: "1MP22CG044", name: "RADHIKA RANI Y P", email: "1mp22cg044@gmail.com" },
    { usn: "1MP22CG045", name: "RASHMITHA S MURTHY", email: "1mp22cg045@gmail.com" },
    { usn: "1MP22CG046", name: "ROSHINI.D", email: "1mp22cg046@gmail.com" },
    { usn: "1MP22CG047", name: "SANJUKTHA VIJAY", email: "1mp22cg047@gmail.com" },
    { usn: "1MP22CG048", name: "SANTHOSH S M", email: "1mp22cg048@gmail.com" },
    { usn: "1MP22CG050", name: "SHWETHA S NAYAK", email: "1mp22cg050@gmail.com" },
    { usn: "1MP22CG051", name: "H R SRUSHTI", email: "1MP22CG051@gmail.com" },
    { usn: "1MP22CG052", name: "SURENDRA D", email: "1mp22cg052@gmail.com" },
    { usn: "1MP22CG053", name: "SWAPNA KASHINATH SARANGAMATH", email: "1mp22cg053@gmail.com" },
    { usn: "1MP22CG054", name: "SWAROOP GIRISH", email: "1mp22cg054@gmail.com" },
    { usn: "1MP22CG055", name: "SWEEKAR B V", email: "1mp22cg055@gmail.com" },
    { usn: "1MP22CG056", name: "RISHIKESH T R", email: "1mp22cg056@gmail.com" },
    { usn: "1MP22CG057", name: "TARUN K L", email: "1mp22cg057@gmail.com" },
    { usn: "1MP22CG059", name: "YASHAS S", email: "1mp22cg059@gmail.com" },
    { usn: "1MP22CG060", name: "YASHASWINI B C", email: "1mp22cg060@gmail.com" },
    { usn: "1MP22CG062", name: "YATHIRAJ P", email: "1MP22CG062@gmail.com" },
    { usn: "1MP22CG063", name: "YESHASWINI R", email: "1mp22cg063@gmail.com" },
    { usn: "1MP22CG058", name: "VAISHNAVI A", email: "1mp22cg058@gmail.com" },
    { usn: "1MP23CG400", name: "DIVYA S", email: "1mp23cg400@gmail.com" },
    { usn: "1MP23CG401", name: "JAGADISH KUMAR N", email: "1mp23cg401@gmail.com" },
    { usn: "1MP23CG402", name: "RUCHITHA S P", email: "1mp23cg402@gmail.com" },
    { usn: "1PM22CG025", name: "KIRAN KUMAR B", email: "1mp22cg025@gmail.com" },
    { usn: "1PM22CG049", name: "SHASHANK C", email: "1mp22cg049@gmail.com" },
    { usn: "1MP22IS001", name: "AISHWARYA P B", email: "1mp22is001@gmail.com" },
    { usn: "1MP22IS002", name: "AKASH", email: "1mp22is002@gmail.com" },
    { usn: "1MP22IS003", name: "AKHILA H S M", email: "1mp22is003@gmail.com" },
    { usn: "1MP22IS004", name: "ASHNAAZ ASHFAK MUJALE", email: "1mp22is004@gmail.com" },
    { usn: "1MP22IS005", name: "ASHRITHA S", email: "1mp22is005@gmail.com" },
    { usn: "1MP22IS006", name: "ASHUTOSH KUMAR", email: "1mp22is006bgscet@gmail.com" },
    { usn: "1MP22IS007", name: "C SUJITH VARMA", email: "1mp22is007@gmail.com" },
    { usn: "1MP22IS008", name: "CHAITHRA.B", email: "1mp22is008@gmail.com" },
    { usn: "1MP22IS009", name: "CHANDANA H", email: "1mp22is009@gmail.com" },
    { usn: "1MP22IS010", name: "CHANNAVEER B S", email: "1mp22is010@gmail.com" },
    { usn: "1MP22IS011", name: "CHARAN AC", email: "1mp22is011@gmail.com" },
    { usn: "1MP22IS012", name: "CHATHURIKA KM", email: "1mp22is012@gmail.com" },
    { usn: "1MP22IS013", name: "CHIRAG S SHETTY", email: "1mp22is013@gmail.com" },
    { usn: "1MP22IS014", name: "D CHINMAYEE", email: "1mp22is014@gmail.com" },
    { usn: "1MP22IS015", name: "DARSHAN V", email: "1mp22is015@gmail.com" },
    { usn: "1MP22IS016", name: "DEEKSHA N", email: "1mp22is016@gmail.com" },
    { usn: "1MP22IS017", name: "C S DEESHA", email: "1mp22is017@gmail.com" },
    { usn: "1MP22IS018", name: "DHINAKAR GOWDA G H", email: "1mp22is018@gmail.com" },
    { usn: "1MP22IS019", name: "DHRUTHI R", email: "1mp22is019@gmail.com" },
    { usn: "1MP22IS020", name: "ESHWARI R", email: "1mp22is020@gmail.com" },
    { usn: "1MP22IS021", name: "G VISHWAS SAI", email: "1mp22is021@gmail.com" },
    { usn: "1MP22IS022", name: "HARSHITHA A B", email: "1mp22is022@gmail.com" },
    { usn: "1MP22IS023", name: "HUSNA BANU N", email: "1mp22is023@gmail.com" },
    { usn: "1MP22IS024", name: "JAYANTH C N", email: "1mp22is024@gmail.com" },
    { usn: "1MP22IS025", name: "JITHIN M", email: "1mp22is025@gmail.com" },
    { usn: "1MP22IS026", name: "JNANASAGARA M", email: "1mp22is026@gmail.com" },
    { usn: "1MP22IS027", name: "KASHMEERA R GOWDA", email: "1mp22is027@gmail.com" },
    { usn: "1MP22IS028", name: "LIKHITHA M", email: "1mp22is028@gmail.com" },
    { usn: "1MP22IS029", name: "LINGARAJ", email: "1mp22is029@gmail.com" },
    { usn: "1MP22IS030", name: "M SHARATH GOWDA", email: "1mp22is030@gmail.com" },
    { usn: "1MP22IS031", name: "MOHITH L", email: "1mp22is031@gmail.com" },
    { usn: "1MP22IS032", name: "MOHITH M L", email: "1MP22IS032@gmail.com" },
    { usn: "1MP22IS033", name: "MONICA R", email: "1mp22is033@gmail.com" },
    { usn: "1MP22IS034", name: "MOULYA REDDY A", email: "1mp22is034@gmail.com" },
    { usn: "1MP22IS035", name: "MOWLYA B A", email: "1mp22is035@gmail.com" },
    { usn: "1MP22IS036", name: "NANDAN SA", email: "1mp22is036@gmail.com" },
    { usn: "1MP22IS037", name: "NISHITHA N", email: "1mp22is037@gmail.com" },
    { usn: "1MP22IS038", name: "PRAJWAL D", email: "1mp22is038@gmail.com" },
    { usn: "1MP22IS039", name: "RAHUL S", email: "1mp22is039@gmail.com" },
    { usn: "1MP22IS040", name: "RAKSHAN R RAO", email: "1mp22is040@gmail.com" },
    { usn: "1MP22IS041", name: "REKHA D", email: "1mp22is041@gmail.com" },
    { usn: "1MP22IS042", name: "REVATHI H", email: "1mp22is042@gmail.com" },
    { usn: "1MP22IS043", name: "SAI SMITHA", email: "1mp22is043@gmail.com" },
    { usn: "1MP22IS044", name: "SAI SUSHMITHA", email: "1mp22is044@gmail.com" },
    { usn: "1MP22IS045", name: "SANJANA.G", email: "1mp22is045@gmail.com" },
    { usn: "1MP22IS046", name: "SHANKARGOUD SHARANABASAPPA PATIL", email: "1mp22is046@gmail.com" },
    { usn: "1MP22IS047", name: "SHASHANK N", email: "1mp22is047@gmail.com" },
    { usn: "1MP22IS048", name: "SHASHIKIRAN B.S", email: "1MP22IS048@gmail.com" },
    { usn: "1MP22IS049", name: "SHRAVAN M", email: "1mp22is049@gmail.com" },
    { usn: "1MP22IS050", name: "SHRAVAN M S", email: "1mp22is050@gmail.com" },
    { usn: "1MP22IS051", name: "SHREE VIBHA S", email: "1mp22is051@gmail.com" },
    { usn: "1MP22IS052", name: "SIDDESH S K", email: "1mp22is052@gmail.com" },
    { usn: "1MP22IS053", name: "SINCHANA S MURTHY", email: "1mp22is053@gmail.com" },
    { usn: "1MP22IS054", name: "SNEHA M", email: "1mp22is054@gmail.com" },
    { usn: "1MP22IS055", name: "SRUJAN D J", email: "1mp22is055@gmail.com" },
    { usn: "1MP22IS056", name: "B R SUBHASH", email: "1mp22is056@gmail.com" },
    { usn: "1MP22IS057", name: "SUPREETH N.P", email: "1mp22is057@gmail.com" },
    { usn: "1MP22IS058", name: "SWARNASHREE S", email: "1mp22is058@gmail.com" },
    { usn: "1MP22IS059", name: "TANISHA M JADHAV", email: "1MP22IS059@gmail.com" },
    { usn: "1MP22IS060", name: "S B THIPPESH PATEL", email: "1mp22is060@gmail.com" },
    { usn: "1MP22IS061", name: "UMA K S", email: "1mp22is061@gmail.com" },
    { usn: "1MP22IS062", name: "VADDI RAGHUNANDAN", email: "1mp22is062@gmail.com" },
    { usn: "1MP22IS063", name: "VEDANTH.P", email: "1mp22is063@gmail.com" },
    { usn: "1MP23IS400", name: "BINDU R", email: "1mp23is400@gmail.com" },
    { usn: "1MP23IS401", name: "K T CHANDANA", email: "1mp23is401@gmail.com" },
    { usn: "1MP23IS402", name: "DARSHAN I L", email: "1mp23is402@gmail.com" },
    { usn: "1MP23IS403", name: "HEMANTH GN", email: "1mp23is403@gmail.com" },
    { usn: "1MP23IS404", name: "VANDANA T S", email: "1mp23is404@gmail.com" },
    { usn: "1MP23IS405", name: "YASHWANTHA KR", email: "1mp23is405@gmail.com" }
];

// Initialize results tracking
const importResults = {
    startTime: new Date().toISOString(),
    totalProcessed: 0,
    successful: [],
    failed: [],
    skipped: [],
    errors: []
};

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✓ MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error.message);
        importResults.errors.push({
            type: 'DATABASE_CONNECTION',
            message: error.message,
            timestamp: new Date().toISOString()
        });
        return false;
    }
}

function parseUSN(usn) {
    const usnLower = usn.toLowerCase().trim();
    const regex = /^(\d{0,2})([a-z]{2})(\d{2})([a-z]{2})(\d{3})$/;
    const match = usnLower.match(regex);
    
    if (!match) {
        throw new Error(`Invalid USN format: ${usn}`);
    }
    
    const collegeCode = match[1] + match[2];
    const year = "20" + match[3];
    const department = match[4];
    const rollNo = match[5];
    
    // Calculate semester based on year (assuming current year is 2024)
    const usnYear = parseInt(match[3]);
    let semester;
    
    switch(usnYear) {
        case 21:
            semester = 7; // 7th semester in 2024
            break;
        case 22:
            semester = 5; // 5th semester in 2024
            break;
        case 23:
            semester = 3; // 3rd semester in 2024
            break;
        case 24:
            semester = 1; // 1st semester in 2024
            break;
        default:
            semester = 1; // Default for unknown years
    }
    
    return {
        collegeCode,
        year,
        department,
        rollNo,
        semester
    };
}

function splitName(fullName) {
    // Clean and split the name
    const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
    
    // Handle different name formats
    let fname = '';
    let lname = '';
    
    if (nameParts.length === 0) {
        fname = 'Student'; // Default if no name
    } else if (nameParts.length === 1) {
        fname = nameParts[0];
    } else {
        fname = nameParts[0];
        lname = nameParts.slice(1).join(' ');
    }
    
    // Capitalize names properly
    fname = fname.charAt(0).toUpperCase() + fname.slice(1).toLowerCase();
    if (lname) {
        lname = lname.split(' ')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    }
    
    return { fname, lname };
}

async function importSingleUser(studentData, index) {
    const userResult = {
        index: index + 1,
        usn: studentData.usn,
        email: studentData.email,
        name: studentData.name,
        status: 'pending',
        errors: []
    };
    
    try {
        // Validate required fields
        if (!studentData.usn || !studentData.email) {
            userResult.status = 'failed';
            userResult.errors.push('Missing required fields (USN or Email)');
            return userResult;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.email)) {
            userResult.status = 'failed';
            userResult.errors.push(`Invalid email format: ${studentData.email}`);
            return userResult;
        }
        
        // Parse USN
        let parsedUSN;
        try {
            parsedUSN = parseUSN(studentData.usn);
        } catch (parseError) {
            userResult.status = 'failed';
            userResult.errors.push(parseError.message);
            return userResult;
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { USN: studentData.usn.toLowerCase() },
                { email: studentData.email.toLowerCase() }
            ]
        });
        
        if (existingUser) {
            userResult.status = 'skipped';
            userResult.errors.push(`User already exists with ${existingUser.USN === studentData.usn.toLowerCase() ? 'USN' : 'email'}`);
            userResult.existingUserId = existingUser._id;
            return userResult;
        }
        
        // Split name
        const { fname, lname } = splitName(studentData.name || '');
        
        // Generate random URL
        const randurl = crypto.randomBytes(32).toString('hex');
        
        // Create user data
        const userData = {
            email: studentData.email.toLowerCase(),
            USN: studentData.usn.toLowerCase(),
            fname: fname,
            lname: lname,
            active: true, // Auto-activate since no email verification
            userallowed: true, // Allow immediate login
            randomurl: randurl,
            Year: parsedUSN.year,
            Department: parsedUSN.department,
            Rollno: parsedUSN.rollNo,
            Semester: parsedUSN.semester,
            usertype: 'student',
            created: new Date()
        };
        
        // Register user with passport-local-mongoose
        const newUser = await User.register(userData, DEFAULT_PASSWORD);
        
        userResult.status = 'success';
        userResult.userId = newUser._id;
        userResult.userData = {
            fname: newUser.fname,
            lname: newUser.lname,
            department: newUser.Department,
            semester: newUser.Semester
        };
        
        return userResult;
        
    } catch (error) {
        userResult.status = 'failed';
        userResult.errors.push(error.message);
        if (error.stack) {
            userResult.errorStack = error.stack;
        }
        return userResult;
    }
}

async function importAllUsers() {
    console.log('\n========== STARTING BULK IMPORT ==========');
    console.log(`Total students to import: ${STUDENT_DATA.length}`);
    console.log(`Default password: ${DEFAULT_PASSWORD}`);
    console.log('------------------------------------------\n');
    
    // Process each student
    for (let i = 0; i < STUDENT_DATA.length; i++) {
        const student = STUDENT_DATA[i];
        importResults.totalProcessed++;
        
        // Show progress every 10 users
        if ((i + 1) % 10 === 0) {
            console.log(`Progress: ${i + 1}/${STUDENT_DATA.length} processed...`);
        }
        
        const result = await importSingleUser(student, i);
        
        // Categorize results
        switch (result.status) {
            case 'success':
                importResults.successful.push(result);
                console.log(`✓ ${result.usn} - ${result.userData.fname} ${result.userData.lname}`);
                break;
            case 'failed':
                importResults.failed.push(result);
                console.log(`✗ ${result.usn} - FAILED: ${result.errors.join(', ')}`);
                break;
            case 'skipped':
                importResults.skipped.push(result);
                console.log(`⚠ ${result.usn} - SKIPPED: ${result.errors.join(', ')}`);
                break;
        }
    }
    
    importResults.endTime = new Date().toISOString();
    
    // Display summary
    console.log('\n========== IMPORT SUMMARY ==========');
    console.log(`Total Processed: ${importResults.totalProcessed}`);
    console.log(`✓ Successful: ${importResults.successful.length}`);
    console.log(`✗ Failed: ${importResults.failed.length}`);
    console.log(`⚠ Skipped: ${importResults.skipped.length}`);
    console.log('====================================\n');
    
    // Save detailed results to JSON files
    saveResultsToFiles();
}

function saveResultsToFiles() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save complete results
    const resultsFilename = `import-results-${timestamp}.json`;
    fs.writeFileSync(resultsFilename, JSON.stringify(importResults, null, 2));
    console.log(`Complete results saved to: ${resultsFilename}`);
    
    // Save failed imports separately if any
    if (importResults.failed.length > 0) {
        const failedFilename = `import-failed-${timestamp}.json`;
        const failedData = {
            timestamp: importResults.startTime,
            totalFailed: importResults.failed.length,
            failedStudents: importResults.failed
        };
        fs.writeFileSync(failedFilename, JSON.stringify(failedData, null, 2));
        console.log(`Failed imports saved to: ${failedFilename}`);
    }
    
    // Create a CSV of successful imports for reference
    if (importResults.successful.length > 0) {
        const csvFilename = `import-successful-${timestamp}.csv`;
        const csvContent = [
            'USN,Email,First Name,Last Name,Department,Semester',
            ...importResults.successful.map(r => 
                `${r.usn},${r.email},${r.userData.fname},${r.userData.lname},${r.userData.department},${r.userData.semester}`
            )
        ].join('\n');
        fs.writeFileSync(csvFilename, csvContent);
        console.log(`Successful imports CSV saved to: ${csvFilename}`);
    }
}

// Main execution
async function main() {
    try {
        // Connect to database
        const dbConnected = await connectDB();
        if (!dbConnected) {
            console.error('Cannot proceed without database connection');
            process.exit(1);
        }
        
        // Run the import
        await importAllUsers();
        
        console.log('\n✓ Import process completed!');
        
        // Show any critical errors
        if (importResults.errors.length > 0) {
            console.log('\n⚠ Critical errors encountered:');
            importResults.errors.forEach(err => {
                console.log(`  - ${err.type}: ${err.message}`);
            });
        }
        
    } catch (error) {
        console.error('\n✗ Fatal error during import:', error);
        importResults.errors.push({
            type: 'FATAL_ERROR',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Save whatever results we have
        saveResultsToFiles();
        
    } finally {
        // Close database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n✓ Database connection closed');
        }
    }
}

// Run the script
main();
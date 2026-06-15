import TeacherChatTab from "../components/teacher/TeacherChatTab";
import PageWrapper from "../components/layout/PageWrapper";

function TeacherChatsPage() {
    return (
        <PageWrapper>
            <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 w-full relative z-10">
                <TeacherChatTab standalone />
            </main>
        </PageWrapper>
    );
}

export default TeacherChatsPage;

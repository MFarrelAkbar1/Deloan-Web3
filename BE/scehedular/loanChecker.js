const cron = require('node-cron');
const ethers = require('ethers');
const Loan = require('../models/Loan'); // Model pinjaman
const contract = require('../utils/blockchain'); // Kontrak blockchain

async function checkLoanDeadlines() {
    try {
        const now = new Date();
        const overdueLoans = await Loan.find({
            status: {$in : ['transferred', 'repaid']},
        });

        for (const loan of overdueLoans) {
            const createdAt = new Date(loan.createdAt);
            const dueDate= new Date(createdAt);
            duedate.setDate(createdAt.getDate() + loan.durationDays);

            if (now >= dueDate) {
                console.log('cheking loan: ${loan.loanId}...');
                const loanIdHash = ethers.id(loan.loanId);

                if (loan.status === 'repaid') {
                    console.log(`Loan ${loan.loanId} repaid successfully: ${tx.hash}`);
                    const tx = await contract.markLoanRepaid(loanIdHash);
                    await tx.wait();
                }else{
                    console.log(`Loan ${loan.loanId} overdue, marking as defaulted`);
                    const tx = await contract.seizeCollateral(loanIdHash);
                    await tx.wait();
                }

                loan.status = loan.status === 'repaid' ? 'repaid' : 'defaulted';
                await loan.save();
            }
        }
    } catch (error) {
        console.error('Error checking loan deadlines:', error);
    }
}   

cron.schedule('0 0 * * 0', () => {
  console.log('Running loan deadline check once a week on Sunday at midnight');
  checkLoanDeadlines();
});
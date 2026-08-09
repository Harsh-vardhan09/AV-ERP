function ShimmerUi(){
    const Content = [
        {id: 1, name:"io"},
        {id: 2, name:"io"},
        {id: 3, name:"io"},
        {id: 4, name:"hj"},
        {id: 5, name:"hj"},
        {id: 6, name:"hj"},
        {id: 7, name:"cv"},
        {id: 8, name:"cv"},
        {id: 9, name:"cv"},
        {id: 10, name:"av"},
        {id: 11, name:"av"},
        {id: 12, name:"av"},
    ];

    const Contentitems = Content.map(Content => <li className="li div" key={Content.id}></li>);

    const Content2 = [
        {id: 1, name:"io"},
        {id: 2, name:"io"},
        {id: 3, name:"io"},
    ];

    const Content2items = Content2.map(Content2 => <li className="li-2 div" key={Content2.id}></li>);

    return(
        <>
        <div className="navbar div"></div>
        <div className="components">
            <div className="contents">
                <h1 className="H1 div"></h1>
                <ul className="ul-Li">
                    {Contentitems}
                </ul>
            </div>
        </div>
        <div className="components2">
            <div className="contents2">
                <h1 className="H1 div"></h1>
                <ul className="ul-Li2">
                    {Content2items}
                </ul>
            </div>
        </div>
        <style>{`
            * {
                margin: 0;
                padding: 0;
            }
            .navbar {
                height: 64px;
                background-color: rgba(128, 128, 128, 0.137);
            }
            .components {
                height: auto;
            }
            .contents {
                width: 92.5%;
                padding: 5px 56px 0px 56px;
            }
            .contents .H1 {
                height: 32px;
                border-radius: 4px;
                margin: 0px 0px 16px;
                background-color: rgba(128, 128, 128, 0.242);
            }
            .ul-Li {
                height: auto;
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 24px;
            }
            .li {
                height: 148px;
                list-style-type: none;
                background-color: rgb(25, 23, 23);
                cursor: pointer;
                border-radius: 8px;
            }
            .components2 {
                height: auto;
                margin-top: 32px;
            }
            .contents2 {
                width: 92.5%;
                padding: 24px 56px;
            }
            .contents2 .H1 {
                height: 32px;
                border-radius: 4px;
                background-color: rgba(128, 128, 128, 0.242);
            }
            .ul-Li2 {
                height: auto;
                display: grid;
                margin-top: 16px;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 24px;
            }
            .li-2 {
                height: 124px;
                list-style-type: none;
                background-color: rgba(128, 128, 128, 0.215);
                cursor: pointer;
                border-radius: 8px;
                overflow: hidden;
            }
            .div {
                position: relative;
                background-color: rgba(128, 128, 128, 0.242);
                overflow: hidden;
            }
            .div::before {
                content: '';
                position: absolute;
                top: 0;
                width: 150%;
                height: 100%;
                background-image: linear-gradient(to right, rgba(4, 4, 4, 0.023),transparent, rgba(255, 255, 255, 0.434), transparent);
                animation: shimmer 1.5s infinite;
            }
            @keyframes shimmer {
                0% {
                    transform: translateX(-100%);
                }
                100% {
                    transform: translateX(100%);
                }
            }
            @media (max-width: 1024px) {
                .ul-Li {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                .ul-Li2 {
                    grid-template-columns: repeat(1, minmax(0, 1fr));
                }
                .li, .li-2 {
                    height: 100px;
                }
                .contents, .contents2 {
                    padding: 12px 24px;
                }
            }
            @media (max-width: 630px) {
                .ul-Li {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .navbar {
                    height: 48px;
                }
                .li {
                    height: 170px;
                }
                .li-2{
                    height: 124px;
                }
                .contents, .contents2 {
                    padding: 8px 16px;
                }
                .H1 {
                    height: 24px;
                }
            }
        `}</style>
        </>
    );
}

export default ShimmerUi;